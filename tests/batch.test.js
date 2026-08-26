// Tests del reparto automatico de certificados y del empaquetado ZIP.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { resolveNames } from "../src/utils/mikrotikGenerator.js";
import { detectFileKind, findUserForFile, classifyFiles, buildUserStatus } from "../src/utils/certMatcher.js";
import { crc32, createZip } from "../src/utils/zip.js";

const CERT = "-----BEGIN CERTIFICATE-----\nMIIB...\n-----END CERTIFICATE-----";
const KEY = "-----BEGIN ENCRYPTED PRIVATE KEY-----\nMIIE...\n-----END ENCRYPTED PRIVATE KEY-----";

const names = resolveNames({ routerVersion: "v7", vpnName: "vpntestvicente" });
const users = [
  { id: "u1", name: "vpntestvicente", password: "ClaveUno1234" },
  { id: "u2", name: "vpntestvicente2", password: "ClaveDos1234" },
];

const file = (name, text) => ({ name, text });

// ---------------------------------------------------------------------------
//  Reparto de archivos
// ---------------------------------------------------------------------------

test("reconoce el tipo por el contenido, no por la extension", () => {
  assert.equal(detectFileKind(CERT), "cert");
  assert.equal(detectFileKind(KEY), "key");
  assert.equal(detectFileKind("hola"), "unknown");
});

test("con prefijos comunes gana el nombre mas largo (caso real del usuario)", () => {
  // "vpntestvicente" es prefijo de "vpntestvicente2": el archivo del segundo
  // NO puede acabar asignado al primero.
  const a = findUserForFile("vpntestvicente-vpntestvicente.crt", names, users);
  assert.equal(a.user.id, "u1");
  assert.equal(a.exact, true);

  const b = findUserForFile("vpntestvicente-vpntestvicente2.key", names, users);
  assert.equal(b.user.id, "u2");
  assert.equal(b.exact, true);
});

test("reparte una tanda completa de archivos entre los usuarios", () => {
  const result = classifyFiles(
    [
      file("ca-vpntestvicente.crt", CERT),
      file("vpntestvicente-vpntestvicente.crt", CERT),
      file("vpntestvicente-vpntestvicente.key", KEY),
      file("vpntestvicente-vpntestvicente2.crt", CERT),
      file("vpntestvicente-vpntestvicente2.key", KEY),
    ],
    names,
    users
  );

  assert.equal(result.ca.name, "ca-vpntestvicente.crt");
  assert.equal(result.byUser.u1.cert.name, "vpntestvicente-vpntestvicente.crt");
  assert.equal(result.byUser.u1.key.name, "vpntestvicente-vpntestvicente.key");
  assert.equal(result.byUser.u2.cert.name, "vpntestvicente-vpntestvicente2.crt");
  assert.equal(result.byUser.u2.key.name, "vpntestvicente-vpntestvicente2.key");

  const status = buildUserStatus(users, result, Boolean(result.ca));
  assert.ok(status.every((s) => s.ready));
});

test("acumula entre tandas: se pueden soltar los archivos en varias veces", () => {
  const first = classifyFiles([file("ca-vpntestvicente.crt", CERT)], names, users);
  const second = classifyFiles(
    [file("vpntestvicente-vpntestvicente.crt", CERT), file("vpntestvicente-vpntestvicente.key", KEY)],
    names,
    users,
    first
  );
  assert.equal(second.ca.name, "ca-vpntestvicente.crt");
  assert.equal(second.byUser.u1.cert.name, "vpntestvicente-vpntestvicente.crt");
});

test("dice exactamente que falta para cada usuario", () => {
  const result = classifyFiles([file("vpntestvicente-vpntestvicente.crt", CERT)], names, users);
  const status = buildUserStatus(users, result, Boolean(result.ca));

  const u1 = status.find((s) => s.user.id === "u1");
  assert.equal(u1.ready, false);
  assert.deepEqual(u1.missing, ["certificado CA", "su .key"]);

  const u2 = status.find((s) => s.user.id === "u2");
  assert.deepEqual(u2.missing, ["certificado CA", "su .crt", "su .key"]);
});

test("avisa de contrasenas ausentes (modo sin recordar contrasenas)", () => {
  const sinClave = [{ id: "u1", name: "ana", password: "" }];
  const n = resolveNames({ routerVersion: "v7", vpnName: "oficina" });
  const result = classifyFiles(
    [file("ca-oficina.crt", CERT), file("oficina-ana.crt", CERT), file("oficina-ana.key", KEY)],
    n,
    sinClave
  );
  const [status] = buildUserStatus(sinClave, result, Boolean(result.ca));
  assert.equal(status.ready, false);
  assert.deepEqual(status.missing, ["su contrasena"]);
});

test("un certificado suelto sin dueno se toma como la CA", () => {
  const result = classifyFiles([file("autoridad.crt", CERT)], names, users);
  assert.equal(result.ca.name, "autoridad.crt");
  assert.ok(result.warnings.some((w) => w.includes("certificado de la CA")));
});

test("ignora archivos que no son certificados y lo dice", () => {
  const result = classifyFiles([file("notas.txt", "hola")], names, users);
  assert.equal(result.ca, null);
  assert.ok(result.warnings.some((w) => w.includes("notas.txt")));
});

// ---------------------------------------------------------------------------
//  ZIP
// ---------------------------------------------------------------------------

test("crc32 coincide con los valores conocidos del estandar", () => {
  const enc = new TextEncoder();
  assert.equal(crc32(enc.encode("hello")), 0x3610a686);
  assert.equal(crc32(enc.encode("123456789")), 0xcbf43926);
  assert.equal(crc32(new Uint8Array(0)), 0);
});

test("el ZIP generado lo abre un descompresor real", async () => {
  const zip = createZip(
    [
      { name: "ana.ovpn", content: "client\ndev tun\n" },
      { name: "beto.ovpn", content: "client\nproto udp\n" },
    ],
    new Date(2026, 0, 15, 12, 0, 0)
  );
  const buffer = Buffer.from(await zip.arrayBuffer());

  // Estructura basica del formato.
  assert.equal(buffer.readUInt32LE(0), 0x04034b50, "falta la firma de archivo local");
  assert.equal(buffer.readUInt32LE(buffer.length - 22), 0x06054b50, "falta el EOCD");
  assert.equal(buffer.readUInt16LE(buffer.length - 12), 2, "deberia declarar 2 entradas");

  // Y la prueba de verdad: que PowerShell (que usa el ZIP de Windows) lo lea.
  const dir = mkdtempSync(join(tmpdir(), "ovpnzip-"));
  const zipPath = join(dir, "perfiles.zip");
  writeFileSync(zipPath, buffer);
  try {
    execFileSync(
      "powershell.exe",
      ["-NoProfile", "-Command", `Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${dir}' -Force`],
      { stdio: "pipe" }
    );
  } catch (error) {
    assert.fail(`Windows no pudo abrir el ZIP: ${error.stderr?.toString() || error.message}`);
  }
  assert.equal(readFileSync(join(dir, "ana.ovpn"), "utf8"), "client\ndev tun\n");
  assert.equal(readFileSync(join(dir, "beto.ovpn"), "utf8"), "client\nproto udp\n");
});

// ---------------------------------------------------------------------------
//  Paquete de entrega
// ---------------------------------------------------------------------------

const { buildHandoffFiles, buildCredentialsCsv, buildReadme } = await import(
  "../src/utils/handoff.js"
);

const SESION = {
  publicIp: "205.235.6.159",
  port: "11977",
  protocol: "udp",
  vpnNetwork: "10.10.10.0/24",
};
const USUARIOS = [
  { id: "u1", name: "ana", password: "ClaveAna-123" },
  { id: "u2", name: "beto", password: "ClaveBeto;456" },
];
const GENERADO = { u1: "client\ndev tun\n", u2: "client\nproto udp\n" };

test("el paquete lleva un .ovpn por usuario mas instrucciones y credenciales", () => {
  const files = buildHandoffFiles({
    generated: GENERADO,
    users: USUARIOS,
    session: SESION,
    names,
    isV6: false,
    embedCredentials: true,
  });
  const nombres = files.map((f) => f.name).sort();
  assert.deepEqual(nombres, ["LEEME.txt", "ana.ovpn", "beto.ovpn", "credenciales.csv"].sort());
});

test("solo se empaquetan los usuarios que tienen perfil generado", () => {
  const files = buildHandoffFiles({
    generated: { u1: "client\n" }, // beto todavia no
    users: USUARIOS,
    session: SESION,
    names,
    isV6: false,
    embedCredentials: true,
  });
  assert.ok(files.some((f) => f.name === "ana.ovpn"));
  assert.ok(!files.some((f) => f.name === "beto.ovpn"));
  // Y el CSV tampoco lo menciona.
  assert.ok(!files.find((f) => f.name === "credenciales.csv").content.includes("beto"));
});

test("el CSV se puede desactivar (no reenviar contrasenas por error)", () => {
  const files = buildHandoffFiles({
    generated: GENERADO,
    users: USUARIOS,
    session: SESION,
    names,
    isV6: false,
    embedCredentials: true,
    includeCredentials: false,
  });
  assert.ok(!files.some((f) => f.name === "credenciales.csv"));
  assert.ok(files.some((f) => f.name === "LEEME.txt"));
});

test("el CSV escapa el separador y abre bien en Excel", () => {
  const csv = buildCredentialsCsv({ session: SESION, users: USUARIOS, isV6: false });
  assert.ok(csv.startsWith("\ufeff"), "necesita BOM para los acentos en Excel");
  // La contrasena de beto lleva ';', el separador: debe ir entrecomillada.
  assert.ok(csv.includes('"ClaveBeto;456"'));
  // Ojo: .trim() se comeria el BOM, porque U+FEFF cuenta como espacio en JS.
  const lineas = csv.split("\r\n").filter(Boolean);
  assert.equal(lineas.length, 3, "cabecera + 2 usuarios");
  assert.equal(lineas[0], "\ufeffUsuario;Contrasena;Servidor;Puerto;Protocolo;Archivo .ovpn");
  assert.ok(lineas[1].includes("ana;ClaveAna-123;205.235.6.159;11977;udp;ana.ovpn"));
});

test("el LEEME explica que la llave privada es de cada usuario, no comun", () => {
  const readme = buildReadme({
    session: SESION,
    users: USUARIOS,
    names,
    isV6: false,
    embedCredentials: false,
  });
  assert.ok(readme.includes("SU PROPIA llave privada"));
  assert.ok(readme.includes("no sirve para otro"));
  assert.ok(readme.includes(`${names.ca}.crt`), "debe nombrar el CA, que si es comun");
  // Con credenciales fuera del .ovpn, avisa de los tres campos.
  assert.ok(readme.includes("Private Key Password"));
  assert.ok(readme.includes("Username"));
});

test("el LEEME cambia si las credenciales van dentro del .ovpn", () => {
  const conCreds = buildReadme({
    session: SESION,
    users: USUARIOS,
    names,
    isV6: false,
    embedCredentials: true,
  });
  assert.ok(conCreds.includes("ya van dentro del archivo"));
  assert.ok(!conCreds.includes("Username ......"));
});

test("el paquete completo se empaqueta en un ZIP legible", async () => {
  const files = buildHandoffFiles({
    generated: GENERADO,
    users: USUARIOS,
    session: SESION,
    names,
    isV6: false,
    embedCredentials: true,
  });
  const zip = createZip(files, new Date(2026, 0, 15, 12, 0, 0));
  const buffer = Buffer.from(await zip.arrayBuffer());
  assert.equal(buffer.readUInt32LE(0), 0x04034b50);
  assert.equal(buffer.readUInt16LE(buffer.length - 12), 4, "4 archivos en el paquete");
});
