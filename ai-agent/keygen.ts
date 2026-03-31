import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import fs from "fs";
import path from "path";

// Получаем путь для сохранения файла из аргументов командной строки или используем по умолчанию
const args = process.argv.slice(2);
const defaultPath = path.resolve(process.cwd(), "new-keypair.json");
const savePath = args[0] || defaultPath;

// Генерируем совершенно новый случайный кошелек (без сид-фразы)
const keypair = Keypair.generate();

const address = keypair.publicKey.toBase58();
const secretKeyArray = Array.from(keypair.secretKey);
const privateKeyBase58 = bs58.encode(keypair.secretKey);

// Сохраняем в файл JSON (стандарт для Solana CLI и Anchor)
fs.mkdirSync(path.dirname(savePath), { recursive: true });
fs.writeFileSync(savePath, JSON.stringify(secretKeyArray));

console.log("==========================================");
console.log("✅ Успешно сгенерирован новый кошелек!");
console.log("==========================================");
console.log(`📁 Файл ключа: ${savePath}`);
console.log(`🔑 Public Key (Адрес): ${address}`);
console.log(`🔐 Private Key (Base58 для Phantom): ${privateKeyBase58}`);
console.log("==========================================");
console.log("Используйте Private Key (Base58) для импорта в Phantom.");
