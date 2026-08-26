// Tests del generador. Se ejecutan con:  npm test   (usa node:test, sin dependencias)
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  escapeRos,
  sanitizeName,
  isValidIp,
  isValidHost,
  parseCidr,
  deriveVpnNetwork,
  validatePoolRange,
  validateGateway,
  resolveNames,
  certNameFor,
  generateServerScript,
  generateAddUsersScript,
  generateRevokeUsersScript,
  generateOvpnFile,
  generateClientRouterScript,
  algorithmsFor,
  clientAuthOptions,
  generateDiagnosticScript,
  randomPrivateNetwork,
  randomVpnPort,
  isPrivateIp,
} from "../src/utils/mikrotikGenerator.js";

// ---------------------------------------------------------------------------
//  Saneado / inyeccion
// ---------------------------------------------------------------------------

test("escapeRos neutraliza las comillas que cerraban la cadena", () => {
  assert.equal(escapeRos('abc"; /system reset-configuration'), 'abc\\"; /system reset-configuration');
  assert.equal(escapeRos("con$variable"), "con\\$variable");
  assert.equal(escapeRos("barra\\atras"), "barra\\\\atras");
  assert.equal(escapeRos("salto\nde\nlinea"), "saltodelinea");
});

test("un password malicioso NO puede inyectar comandos en el script", () => {
  const evil = 'abc"; /system reset-configuration no-defaults=yes; :put "x';
  const script = generateServerScript({
    routerVersion: "v7",
    publicIp: "1.2.3.4",
    users: [{ name: "user1", password: evil }],
  });
  // La comilla queda escapada y el comando peligroso nunca queda "suelto".
  assert.ok(!/\n\s*\/system reset-configuration/.test(script));
  assert.ok(script.includes('\\"; /system reset-configuration'));
});

test("sanitizeName limpia nombres para RouterOS y para el nombre de archivo", () => {
  assert.equal(sanitizeName("Juan Pérez 01"), "JuanPerez01");
  assert.equal(sanitizeName("../../etc/passwd"), "etcpasswd");
  assert.equal(sanitizeName("   ", "cliente1"), "cliente1");
});

// ---------------------------------------------------------------------------
//  Red de la VPN (el bug del /24 asumido)
// ---------------------------------------------------------------------------

test("isValidIp rechaza octetos fuera de rango", () => {
  assert.equal(isValidIp("300.1.1.1"), false);
  assert.equal(isValidIp("10.0.0.1"), true);
  assert.equal(isValidHost("vpn.midominio.ec"), true);
});

test("parseCidr rechaza redes invalidas con un mensaje util", () => {
  assert.equal(parseCidr("300.1.1.0/24").ok, false);
  assert.equal(parseCidr("10.8.0.0/33").ok, false);
  assert.equal(parseCidr("10.8.0.0/24").ok, true);
});

test("deriveVpnNetwork calcula la red real, no asume /24", () => {
  const a = deriveVpnNetwork("10.10.10.0/24");
  assert.equal(a.network, "10.10.10.0/24");
  assert.equal(a.localAddress, "10.10.10.1");
  assert.equal(a.poolRange, "10.10.10.2-10.10.10.254");

  // /30: antes daba un pool .10-.254 imposible dentro de 4 direcciones.
  const b = deriveVpnNetwork("192.168.9.0/30");
  assert.equal(b.network, "192.168.9.0/30");
  assert.equal(b.localAddress, "192.168.9.1");
  assert.equal(b.poolRange, "192.168.9.2-192.168.9.2");

  // /16 con una IP que no es la direccion de red: se normaliza.
  const c = deriveVpnNetwork("10.8.5.0/16");
  assert.equal(c.network, "10.8.0.0/16");
  assert.equal(c.localAddress, "10.8.0.1");
});

test("validatePoolRange detecta rangos fuera de la red", () => {
  assert.equal(validatePoolRange("10.10.10.2-10.10.10.254", "10.10.10.0/24"), null);
  assert.match(validatePoolRange("10.10.10.2-10.10.10.255", "10.10.10.0/24"), /broadcast/);
  assert.match(validatePoolRange("10.99.0.10-10.99.0.20", "10.10.10.0/24"), /dentro de/);
  assert.match(validatePoolRange("10.10.10.50-10.10.10.20", "10.10.10.0/24"), /mayor que/);
});

test("validateGateway detecta el gateway dentro del pool", () => {
  assert.equal(validateGateway("10.10.10.1", "10.10.10.0/24", "10.10.10.2-10.10.10.254"), null);
  assert.match(
    validateGateway("10.10.10.50", "10.10.10.0/24", "10.10.10.2-10.10.10.254"),
    /DENTRO del pool/
  );
  assert.match(validateGateway("10.99.9.1", "10.10.10.0/24", ""), /fuera de la red/);
});

// ---------------------------------------------------------------------------
//  Un servidor, N usuarios
// ---------------------------------------------------------------------------

const USERS = [
  { name: "ana", password: "ClaveSegura1" },
  { name: "beto", password: "OtraClave22" },
  { name: "caro", password: "TerceraClave3" },
];

test("un solo servidor OVPN atiende a todos los usuarios (7.17+)", () => {
  const script = generateServerScript({
    routerVersion: "v7",
    vpnName: "oficina",
    publicIp: "181.188.203.190",
    users: USERS,
  });
  // Una sola CA, un solo certificado de servidor, un solo servidor OVPN.
  assert.equal((script.match(/\/certificate add name="ca-oficina"/g) || []).length, 1);
  assert.equal((script.match(/ovpn-server server add name="ovpn-oficina"/g) || []).length, 1);
  // Pero un certificado y un ppp secret por usuario, todos con la MISMA CA.
  for (const u of USERS) {
    assert.ok(script.includes(`/certificate sign "oficina-${u.name}" ca="ca-oficina"`));
    assert.ok(script.includes(`/ppp secret add name="${u.name}"`));
    assert.ok(script.includes(`profile="prof-oficina"`));
  }
});

test("en RouterOS 6 / 7.0-7.16 el servidor es unico y compartido", () => {
  const script = generateServerScript({ routerVersion: "v6", users: USERS, publicIp: "1.2.3.4" });
  assert.ok(script.includes("/interface ovpn-server server set enabled=yes"));
  assert.ok(!script.includes("server add name="));
  assert.ok(script.includes('ca="ca-ovpn"'));
  // RouterOS 6 no admite protocol= en el servidor OVPN.
  assert.ok(!/ovpn-server server set[^\n]*protocol=/.test(script));
});

test("el script del servidor es idempotente (reejecutable sin romper nada)", () => {
  const script = generateServerScript({ routerVersion: "v7", users: USERS, publicIp: "1.2.3.4" });
  assert.ok(script.includes(':if ([:len [/certificate find name="ca-vpn1"]] = 0) do={'));
  assert.ok(script.includes(':if ([:len [/ip pool find name="pool-vpn1"]] = 0) do={'));
  // No hay borrados globales de la CA ni del servidor.
  assert.ok(!/\/certificate remove \[find name="ca-vpn1"\]/.test(script));
});

test("anadir usuarios no toca la infraestructura ni a los demas", () => {
  const script = generateAddUsersScript({
    routerVersion: "v7",
    vpnName: "oficina",
    users: [{ name: "nuevo", password: "ClaveNueva9" }],
  });
  assert.ok(script.includes(':error "No existe la CA ca-oficina'));
  assert.ok(script.includes('/ppp secret add name="nuevo"'));
  // Nada de servidor, pool, perfil, firewall o NAT.
  for (const forbidden of ["ovpn-server server", "/ip pool add", "/ppp profile add", "/ip firewall"]) {
    assert.ok(!script.includes(forbidden), `no deberia contener ${forbidden}`);
  }
  // Ni tocar a otros usuarios.
  assert.ok(!script.includes('name="ana"'));
});

test("la revocacion corta el acceso del usuario indicado", () => {
  const script = generateRevokeUsersScript({
    routerVersion: "v7",
    vpnName: "oficina",
    users: [{ name: "beto" }],
  });
  assert.ok(script.includes('/ppp secret remove [find name="beto"]'));
  assert.ok(script.includes('/ppp active remove [find name="beto"]'));
  assert.ok(script.includes('/certificate issued-revoke [find name="oficina-beto"]'));
  assert.ok(!script.includes('name="ana"'));
});

test("SIEMPRE exporta el certificado de la CA a Files", () => {
  // Regresion real: sin este archivo el usuario tiene su .crt y su .key pero no
  // puede montar ningun .ovpn, porque el bloque <ca> se queda sin contenido.
  const server = generateServerScript({
    routerVersion: "v7",
    vpnName: "oficina",
    publicIp: "1.2.3.4",
    users: USERS,
  });
  assert.ok(server.includes('/certificate export-certificate "ca-oficina" file-name="ca-oficina"'));

  const add = generateAddUsersScript({
    routerVersion: "v7",
    vpnName: "oficina",
    users: [{ name: "nuevo", password: "ClaveNueva9" }],
  });
  assert.ok(add.includes('/certificate export-certificate "ca-oficina" file-name="ca-oficina"'));

  // Y en la rama de servidor unico, donde la CA se llama ca-ovpn.
  const v6 = generateServerScript({ routerVersion: "v6", publicIp: "1.2.3.4", users: USERS });
  assert.ok(v6.includes('/certificate export-certificate "ca-ovpn" file-name="ca-ovpn"'));
});

test("exporta un .crt y un .key por cada usuario", () => {
  const script = generateServerScript({
    routerVersion: "v7",
    vpnName: "oficina",
    publicIp: "1.2.3.4",
    users: USERS,
  });
  for (const u of USERS) {
    assert.ok(
      script.includes(
        `/certificate export-certificate "oficina-${u.name}" export-passphrase="${u.password}" file-name="oficina-${u.name}"`
      ),
      `falta la exportacion de ${u.name}`
    );
  }
});

test("el firewall abre el puerto Y permite el forward (VPN sin internet)", () => {
  const script = generateServerScript({
    routerVersion: "v7",
    users: USERS,
    publicIp: "1.2.3.4",
    network: "10.10.10.0/24",
  });
  assert.ok(/chain=input action=accept protocol=udp dst-port=1194/.test(script));
  assert.ok(/chain=forward action=accept src-address=10\.10\.10\.0\/24/.test(script));
});

test("el NAT usa masquerade por defecto (router detras de modem)", () => {
  const masq = generateServerScript({ routerVersion: "v7", users: USERS, publicIp: "1.2.3.4" });
  assert.ok(masq.includes("action=masquerade"));
  const srcnat = generateServerScript({
    routerVersion: "v7",
    users: USERS,
    publicIp: "1.2.3.4",
    natMode: "srcnat",
  });
  assert.ok(srcnat.includes("action=src-nat to-addresses=1.2.3.4"));
});

test("los nombres de certificado no chocan entre VPN distintas del mismo router", () => {
  const a = resolveNames({ routerVersion: "v7", vpnName: "sedeA" });
  const b = resolveNames({ routerVersion: "v7", vpnName: "sedeB" });
  assert.notEqual(certNameFor(a, "juan"), certNameFor(b, "juan"));
  assert.equal(certNameFor(a, "juan"), "sedeA-juan");
});

test("los algoritmos del cliente son siempre un subconjunto de los del servidor", () => {
  for (const version of ["v6", "v7-legacy", "v7"]) {
    const { authList } = algorithmsFor(version);
    const habilitados = authList.split(",");
    for (const opcion of clientAuthOptions(version)) {
      assert.ok(
        habilitados.includes(opcion.toLowerCase()),
        `el cliente ofrece ${opcion} pero el servidor ${version} no lo habilita`
      );
    }
  }
});

test("sha512 solo se habilita en 7.17+, donde existe seguro", () => {
  assert.ok(!algorithmsFor("v7-legacy").authList.includes("sha512"));
  assert.ok(algorithmsFor("v7").authList.includes("sha512"));
  // Y RouterOS 6 usa los nombres de cifrado sin sufijo.
  assert.equal(algorithmsFor("v6").cipherList, "aes128,aes192,aes256");
});

// ---------------------------------------------------------------------------
//  Archivo .ovpn
// ---------------------------------------------------------------------------

test("el .ovpn puede generarse SIN credenciales embebidas", () => {
  const con = generateOvpnFile({ version: 7, remote: "1.2.3.4", username: "ana", password: "x" });
  assert.ok(con.includes("<auth-user-pass>"));

  const sin = generateOvpnFile({
    version: 7,
    remote: "1.2.3.4",
    username: "ana",
    password: "x",
    embedCredentials: false,
  });
  assert.ok(!sin.includes("<auth-user-pass>"));
  assert.ok(/^auth-user-pass$/m.test(sin));
  assert.ok(!sin.includes("\nx\n"));
});

test("el .ovpn de RouterOS 7 fuerza TLS 1.2 como minimo", () => {
  assert.ok(generateOvpnFile({ version: 7, remote: "1.2.3.4" }).includes("tls-version-min 1.2"));
  assert.ok(!generateOvpnFile({ version: 6, remote: "1.2.3.4" }).includes("tls-version-min"));
});

test("RouterOS 6 fuerza TCP aunque se pida UDP", () => {
  const ovpn = generateOvpnFile({ version: 6, remote: "1.2.3.4", proto: "udp" });
  assert.ok(ovpn.includes("proto tcp"));
});

test("el tunel dividido emite rutas y omite redirect-gateway", () => {
  const ovpn = generateOvpnFile({
    version: 7,
    remote: "1.2.3.4",
    redirectGateway: false,
    routes: ["192.168.88.0/24", "172.16.0.0/16"],
  });
  assert.ok(!ovpn.includes("redirect-gateway"));
  assert.ok(ovpn.includes("route 192.168.88.0 255.255.255.0"));
  assert.ok(ovpn.includes("route 172.16.0.0 255.255.0.0"));
});

test("solo se emiten DNS validos", () => {
  const ovpn = generateOvpnFile({ version: 7, remote: "1.2.3.4", dns: "8.8.8.8, 999.9.9.9 ,1.1.1.1" });
  assert.ok(ovpn.includes("dhcp-option DNS 8.8.8.8"));
  assert.ok(ovpn.includes("dhcp-option DNS 1.1.1.1"));
  assert.ok(!ovpn.includes("999.9.9.9"));
});

// ---------------------------------------------------------------------------
//  Site-to-site
// ---------------------------------------------------------------------------

test("el script de router cliente escapa credenciales y añade rutas", () => {
  const script = generateClientRouterScript({
    version: 7,
    remote: "1.2.3.4",
    username: 'ana"; /quit',
    password: "Clave$1",
    remoteNetworks: ["192.168.88.0/24"],
  });
  assert.ok(script.includes('user="ana\\"; /quit"'));
  assert.ok(script.includes('password="Clave\\$1"'));
  assert.ok(script.includes("/ip route add dst-address=192.168.88.0/24"));
});

test("la regla de NAT NO se coloca la primera: no debe pisar la del router", () => {
  // Caso real: un router con la IP publica en 'lo' y salida por CGNAT necesita
  // su propio src-nat. Si nuestra regla masquerade se pusiera en destination=0,
  // capturaria el trafico de la VPN y lo dejaria sin retorno.
  const script = generateServerScript({
    routerVersion: "v7",
    vpnName: "oficina",
    publicIp: "1.2.3.4",
    users: USERS,
  });
  assert.ok(!/\/ip firewall nat move .* destination=0/.test(script));
  // Las reglas de filtro SI van primero, para saltarse los drop existentes.
  assert.ok(/\/ip firewall filter move \[find comment="OpenVPN-Web-oficina"\] destination=0/.test(script));
});

test("se puede pedir que no se cree ninguna regla de NAT", () => {
  const script = generateServerScript({
    routerVersion: "v7",
    users: USERS,
    publicIp: "1.2.3.4",
    natMode: "none",
  });
  assert.ok(!script.includes("action=masquerade"));
  assert.ok(!script.includes("action=src-nat"));
  assert.ok(script.includes("Elegiste NO crear regla de NAT"));
});

test("el modo NAT automatico respeta las reglas que ya tiene el router", () => {
  // Este es el caso que rompio un router real: la regla nueva se ponia delante
  // de la que ya funcionaba y dejaba la VPN sin retorno.
  const script = generateServerScript({
    routerVersion: "v7",
    users: USERS,
    publicIp: "1.2.3.4",
    natMode: "auto",
  });
  assert.ok(script.includes(":local otrasNat [:len [/ip firewall nat find chain=srcnat]]"));
  assert.ok(script.includes(":if ($otrasNat = 0) do={"));
  // Solo crea masquerade dentro del if, nunca incondicionalmente.
  assert.ok(!/^\/ip firewall nat add/m.test(script));
});

test("auto es el modo por defecto", () => {
  const script = generateServerScript({ routerVersion: "v7", users: USERS, publicIp: "1.2.3.4" });
  assert.ok(script.includes("Modo automatico"));
});

test("el script de diagnostico solo lee, nunca modifica", () => {
  const script = generateDiagnosticScript({
    routerVersion: "v7",
    vpnName: "oficina",
    port: "1194",
    network: "10.10.10.0/24",
  });
  // Ni un solo comando que cambie estado.
  for (const peligroso of [" add ", " set ", " remove ", " disable ", " enable ", "export-certificate"]) {
    assert.ok(!script.includes(peligroso), `el diagnostico no debe contener "${peligroso}"`);
  }
  // Y revisa los puntos que costaron horas de soporte.
  assert.ok(script.includes("ca-oficina"));
  assert.ok(script.includes("/ip firewall nat find chain=srcnat"));
  assert.ok(script.includes("/ppp active find"));
});

test("la version elegida cambia REALMENTE el .ovpn generado", () => {
  const perfil = (routerVersion) => {
    const version = routerVersion === "v6" ? 6 : 7;
    return generateOvpnFile({
      version,
      remote: "1.2.3.4",
      proto: "udp", // se pide UDP a proposito: v6 debe ignorarlo
      auth: clientAuthOptions(routerVersion)[0],
      cipher: "AES-256-CBC",
    });
  };

  const v6 = perfil("v6");
  assert.ok(v6.includes("proto tcp"), "RouterOS 6 debe forzar TCP");
  assert.ok(!v6.includes("tls-version-min"), "RouterOS 6 no soporta tls-version-min");
  assert.ok(v6.includes("auth SHA1"));
  // v6 no negocia cifrado: se fija uno solo, sin lista.
  assert.ok(v6.includes("data-ciphers AES-256-CBC\n"));

  for (const v7 of ["v7-legacy", "v7"]) {
    const ovpn = perfil(v7);
    assert.ok(ovpn.includes("proto udp"), `${v7} debe respetar UDP`);
    assert.ok(ovpn.includes("tls-version-min 1.2"), `${v7} debe exigir TLS 1.2`);
    assert.ok(ovpn.includes("auth SHA256"));
    assert.ok(ovpn.includes("data-ciphers AES-256-CBC:AES-128-CBC"));
  }
});

test("el .ovpn nunca pide un algoritmo que el servidor no acepte", () => {
  // Blinda la coherencia entre las dos mitades: si un dia se toca una lista y
  // no la otra, el cliente daria "no shared auth" al conectar.
  for (const routerVersion of ["v6", "v7-legacy", "v7"]) {
    const habilitados = algorithmsFor(routerVersion).authList.split(",");
    for (const auth of clientAuthOptions(routerVersion)) {
      const ovpn = generateOvpnFile({
        version: routerVersion === "v6" ? 6 : 7,
        remote: "1.2.3.4",
        auth,
      });
      const usado = ovpn.match(/^auth (.+)$/m)[1];
      assert.ok(
        habilitados.includes(usado.toLowerCase()),
        `${routerVersion}: el .ovpn pide ${usado} y el servidor solo habilita ${authListText(habilitados)}`
      );
    }
  }
});

function authListText(list) {
  return list.join(", ");
}

test("el pool empieza en la PRIMERA direccion utilizable, tras el gateway", () => {
  const a = deriveVpnNetwork("10.10.10.0/24");
  assert.equal(a.localAddress, "10.10.10.1", "el gateway es la primera de la red");
  assert.equal(a.poolRange, "10.10.10.2-10.10.10.254", "el pool arranca justo detras");
  assert.equal(a.hosts, 253);

  // En un /30 solo queda una direccion para clientes.
  const b = deriveVpnNetwork("192.168.9.0/30");
  assert.equal(b.poolRange, "192.168.9.2-192.168.9.2");

  // El gateway nunca cae dentro del pool que se autogenera.
  for (const cidr of ["10.10.10.0/24", "172.20.5.0/24", "192.168.77.0/24", "10.0.0.0/22"]) {
    const d = deriveVpnNetwork(cidr);
    assert.equal(validateGateway(d.localAddress, cidr, d.poolRange), null, `fallo en ${cidr}`);
    assert.equal(validatePoolRange(d.poolRange, cidr), null, `pool invalido en ${cidr}`);
  }
});

test("randomPrivateNetwork sortea redes privadas validas y usables", () => {
  const vistas = new Set();
  for (let i = 0; i < 300; i++) {
    const cidr = randomPrivateNetwork();
    vistas.add(cidr);

    const parsed = parseCidr(cidr);
    assert.equal(parsed.ok, true, `${cidr} no es un CIDR valido`);
    assert.equal(parsed.prefix, 24);
    assert.ok(isPrivateIp(parsed.ip), `${cidr} no esta en un rango privado`);

    // Y produce una red utilizable de inmediato.
    const d = deriveVpnNetwork(cidr);
    assert.equal(d.valid, true);
    assert.equal(d.network, cidr, "la red sorteada ya es direccion de red");
    assert.equal(validateGateway(d.localAddress, cidr, d.poolRange), null);

    // Nunca las que chocan con la LAN tipica de casa o el default de MikroTik.
    for (const conflictiva of ["192.168.0.0/24", "192.168.1.0/24", "192.168.88.0/24"]) {
      assert.notEqual(cidr, conflictiva);
    }
  }
  assert.ok(vistas.size > 100, "deberia variar de verdad, no repetir siempre lo mismo");
});

test("randomVpnPort evita el 1194 y los puertos de gestion del router", () => {
  const prohibidos = [1194, 8291, 8728, 8729, 22, 80, 443, 53, 3389, 8080];
  const vistos = new Set();
  for (let i = 0; i < 300; i++) {
    const port = Number(randomVpnPort());
    assert.ok(Number.isInteger(port));
    assert.ok(port >= 10000 && port <= 49151, `${port} fuera del rango seguro`);
    assert.ok(!prohibidos.includes(port), `${port} es un puerto reservado`);
    vistos.add(port);
  }
  assert.ok(vistos.size > 100, "deberia variar de verdad");
});
