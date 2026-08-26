// Tests del generador/evaluador de contrasenas. Se ejecutan con: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";

// El modulo usa la Web Crypto API del navegador.
if (!globalThis.crypto) globalThis.crypto = webcrypto;

const { generatePassword, checkPassword } = await import("../src/utils/password.js");

test("genera contrasenas del tamano pedido y dentro de los limites", () => {
  assert.equal(generatePassword(16).length, 16);
  assert.equal(generatePassword(4).length, 12, "se sube al minimo de 12");
  assert.equal(generatePassword(999).length, 64, "se acota al maximo de 64");
});

test("las contrasenas generadas son siempre validas para MikroTik", () => {
  // Cubre la regresion del rango de control mal escrito, que llegaba a
  // rechazar los guiones que el propio generador produce.
  for (let i = 0; i < 200; i++) {
    const pw = generatePassword(16);
    const check = checkPassword(pw);
    assert.equal(check.error, null, `contrasena rechazada: ${pw}`);
    assert.ok(check.score >= 3, `contrasena debil generada: ${pw}`);
  }
});

test("no se repiten (entropia real, no Math.random sembrado)", () => {
  const set = new Set(Array.from({ length: 100 }, () => generatePassword(16)));
  assert.equal(set.size, 100);
});

test("acepta caracteres corrientes como el guion y el punto", () => {
  assert.equal(checkPassword("Clave-Segura.2024").error, null);
  assert.equal(checkPassword("Clave_Segura2024").error, null);
});

test("rechaza lo que romperia el script o el .ovpn", () => {
  assert.match(checkPassword("corta1").error, /8 caracteres/);
  assert.match(checkPassword("clave con espacios").error, /espacios/);
  assert.match(checkPassword("clave\nmala1234").error, /control/);
  assert.match(checkPassword("clave\tmala1234").error, /control|espacios/);
});

test("avisa de contrasenas debiles sin bloquearlas", () => {
  const weak = checkPassword("password");
  assert.equal(weak.error, null);
  assert.ok(weak.score <= 1);
  assert.ok(weak.warnings.length > 0);

  const strong = checkPassword("Xk7.mQ2vLp9RtWn4");
  assert.equal(strong.score, 4);
  assert.equal(strong.label, "Muy fuerte");
});

test("avisa (pero permite) caracteres que hay que escapar en RouterOS", () => {
  const check = checkPassword('Clave"Con$Comillas1');
  assert.equal(check.error, null);
  assert.ok(check.warnings.some((w) => w.includes("escapan")));
});
