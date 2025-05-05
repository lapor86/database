import { bot } from './bot.js';
import { createRequire } from "module";
const require = createRequire(import.meta.url);

import fs from "fs";
import axios from "axios";
import chalk from 'chalk';
import schedule from "node-schedule";
import * as cheerio from "cheerio";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";
import path from "path";
import { fileURLToPath } from "url";
import FormData from "form-data";
import { exec } from "child_process";
import cloudscraper from 'cloudscraper';
import moment from "moment-timezone";
import { GoogleGenerativeAI } from "@google/generative-ai";
import os from "os";
import figlet from "figlet";
import { translate } from "@vitalets/google-translate-api";
import { HttpsProxyAgent } from 'https-proxy-agent';
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import validator from "validator";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN = "7944387251:AAHMIi2iyvXjdQhb8K8azTEmdbmcH44lk0M";
const IMGBB_API_KEY = "9a6c7db46a74e55dbdd80b0e0620087d";

const FILE_USERS = path.join(__dirname, "users.json");
const FILE_FORUM = "forum_users.json";
const FILE_CODES = "admin_codes.json";
const LOG_FILE = "log.json";
const userMessages = {};
const DEFAULT_VIDEO = path.join(__dirname, "pagi.mp4");
const FILE_SCHEDULE = path.join(__dirname, "schedule.json"); // ✅ Tambahkan ini
const caption = "SeLaMat PaGi TemAn TemAn Qu";
const gclog = "-1002549314973";
const ADMIN_ID = "6415843289";
const ADMIN_IDS = "6415843289";
const TELEGRAM_USER_ID = 6415843289;
const games = new Map();
const awaitingOpponent = new Map();
const waitingForImage = new Map();
const jamAktif = new Map();
const userSessions = {};
const ytsSessions = {};
const gameSessions = {};
const pendingRequests = {};
const activeMaths = {};
const aiSessions = {};
const spamData = {};
const userStates = {};
const userState = {};
const uploadStatus = {};
const activeClock = {};
let gameData = {};
let autoAI = {};
let promptAI = {};
let bratData = {};
let kbbiData = {};
let koreksiAktif = true;
let kalkulatorData = {};
let tebakGambarSessions = {};
let susunKataSessions = {};
let tebakBenderaSessions = {};
let userSearchResults = {};
let spamSessions = {};
let tebakSiapaAku = {};
let stopMotionData = {};
let autoAiMode = new Set();
let tesaiUsers = new Set();
const settingsFile = "settings.json";

// Debugging polling error
bot.on("polling_error", (error) => {
  console.error("Polling error:", error);
});

let tempSchedule = {};

let scheduledJob = null; // Simpan jadwal saat ini

let rateLimited = false;
let retryAfter = 0;
let activeUsers = new Map(); // Menyimpan user dan waktu terakhir mereka aktif

// Load database
let users = fs.existsSync(FILE_USERS) ? JSON.parse(fs.readFileSync(FILE_USERS)) : {};
let forumUsers = fs.existsSync(FILE_FORUM) ? JSON.parse(fs.readFileSync(FILE_FORUM)) : {};
let adminCodes = fs.existsSync(FILE_CODES) ? JSON.parse(fs.readFileSync(FILE_CODES)) : {};

// Simpan database
function simpanData() {
    fs.writeFileSync(FILE_USERS, JSON.stringify(users, null, 2));
    fs.writeFileSync(FILE_FORUM, JSON.stringify(forumUsers, null, 2));
    fs.writeFileSync(FILE_CODES, JSON.stringify(adminCodes, null, 2));
}

const komikData = new Map();

bot.onText(/^\/komik (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match[1];

  try {
    const response = await fetch(`https://api.crafters.biz.id/manga/pixhentai?text=${encodeURIComponent(query)}`);
    const data = await response.json();

    if (!data.status || !data.result || data.result.length === 0) {
      return bot.sendMessage(chatId, 'Komik tidak ditemukan.');
    }

    const komik = data.result[0];
    const { title, thumbnail, images } = komik;

    const sentMessages = [];

    const thumbMsg = await bot.sendPhoto(chatId, thumbnail, { caption: `Judul: ${title}` });
    sentMessages.push(thumbMsg.message_id);

    for (const img of images) {
      const photoMsg = await bot.sendPhoto(chatId, img);
      sentMessages.push(photoMsg.message_id);
    }

    // ID unik tombol berdasarkan waktu dan message_id
    const uniqueId = `komik_hapus_${thumbMsg.message_id}_${Date.now()}`;

    const deleteBtnMsg = await bot.sendMessage(chatId, 'Klik tombol di bawah untuk menghapus komik ini sebelum 5 menit:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🗑 Hapus Komik', callback_data: uniqueId }]
        ]
      }
    });

    komikData.set(uniqueId, {
      chatId,
      messageIds: sentMessages.concat(deleteBtnMsg.message_id)
    });

    // Auto hapus setelah 5 menit
    setTimeout(() => {
      hapusPesan(uniqueId);
    }, 5 * 60 * 1000);

  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, 'Terjadi kesalahan saat mengambil data komik.');
  }
});

bot.on('callback_query', async (callbackQuery) => {
  const { data } = callbackQuery;

  if (data.startsWith('komik_hapus_')) {
    await hapusPesan(data);
    bot.answerCallbackQuery(callbackQuery.id, { text: 'Komik berhasil dihapus.' });
  }
});

async function hapusPesan(key) {
  const data = komikData.get(key);
  if (!data) return;

  const { chatId, messageIds } = data;
  for (const msgId of messageIds) {
    try {
      await bot.deleteMessage(chatId, msgId);
    } catch (e) {
      // Abaikan error jika gagal hapus
    }
  }

  komikData.delete(key);
}

async function ghibliDownFile(fileId, filePath) {
  const link = await bot.getFileLink(fileId);
  const res = await axios.get(link, { responseType: 'stream' });

  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(filePath);
    res.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function ghibliUpCatbox(filePath) {
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('fileToUpload', fs.createReadStream(filePath));

  const res = await axios.post('https://catbox.moe/user/api.php', form, {
    headers: form.getHeaders()
  });

  return res.data;
}

bot.onText(/\/img2ghibli/, async (msg) => {
  const chatId = msg.chat.id;

  const isReplyWithPhoto = msg.reply_to_message?.photo;
  const isPhotoWithCaption = msg.photo && msg.caption?.startsWith('/img2ghibli');

  if (!isReplyWithPhoto && !isPhotoWithCaption) {
    bot.sendMessage(chatId, 'Kirim gambar dengan caption /img2ghibli atau reply gambar dengan pesan /img2ghibli.');
    return;
  }

  try {
    const photo = isReplyWithPhoto
      ? msg.reply_to_message.photo.pop()
      : msg.photo.pop();

    const tempFilename = `./temp_${msg.message_id}.jpg`;
    const finalFilename = './img2ghibli.jpg';

    // 1. Unduh gambar dari Telegram
    await ghibliDownFile(photo.file_id, tempFilename);

    // 2. Upload ke Catbox
    const catboxUrl = await ghibliUpCatbox(tempFilename);

    // 3. Panggil API img2ghibli
    const apiUrl = `https://api.hiuraa.my.id/tools/img2ghibli?imageUrl=${encodeURIComponent(catboxUrl)}`;
    const res = await axios.get(apiUrl, { responseType: 'stream' });

    // 4. Simpan hasilnya sebagai img2ghibli.jpg
    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(finalFilename);
      res.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // 5. Kirim hasil ke user
    await bot.sendPhoto(chatId, finalFilename, {
      reply_to_message_id: msg.message_id,
      caption: 'Berikut hasil gambar Ghibli-mu!'
    });

    // 6. Hapus file sementara
    fs.unlinkSync(tempFilename);
    fs.unlinkSync(finalFilename);
  } catch (err) {
    console.error('Error:', err.message);
    bot.sendMessage(chatId, 'Terjadi kesalahan saat memproses gambar.');
  }
});

const validTypes = [
  'anonymous', 'confessions', '3words', 'neverhave',
  'tbh', 'shipme', 'yourcrush', 'cancelled', 'dealbreaker', 'random'
];

bot.onText(/^\/spamngl(?:\s(.*))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const argsText = match[1];

  if (!argsText) {
    return bot.sendMessage(chatId, 'Lu harus masukin URL, count, dan type!\nContoh: /spamngl https://ngl.link/yanto_propeleyer_epep 10 random', {
      disable_web_page_preview: true
    });
  }

  const args = argsText.split(' ');

  // if (args.length < 3) {
  //   return bot.sendMessage(chatId, 'Kurang argumen! Format: /spamngl <url_ngl> <count> <type>\nContoh: /spamngl https://ngl.link/yanto_propeleyer_epep 10 random', {
  //     disable_web_page_preview: true
  //   });
  // }

  const [url, count, type] = args;

  if (!url.startsWith('https://ngl.link/')) {
    return bot.sendMessage(chatId, 'URL NGL-nya gak valid, harus dimulai dengan https://ngl.link/', {
      disable_web_page_preview: true
    });
  }

  if (isNaN(count) || parseInt(count) <= 0) {
    return bot.sendMessage(chatId, 'Count harus angka lebih dari 0!', {
      disable_web_page_preview: true
    });
  }

  if (!validTypes.includes(type.toLowerCase())) {
    return bot.sendMessage(chatId, `Type nggak valid!\nGunakan salah satu dari: ${validTypes.join(', ')}`, {
      disable_web_page_preview: true
    });
  }

  userStates[chatId] = { url, count, type };
  bot.sendMessage(chatId, 'Sekarang kirim pesan yang mau lo spam ke NGL:', {
    disable_web_page_preview: true
  });
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;

  if (msg.text.startsWith('/spamngl')) return;

  const state = userStates[chatId];
  if (!state) return;

  const { url, count, type } = state;
  const message = encodeURIComponent(msg.text);

  const apiUrl = `https://fastrestapis.fasturl.cloud/tool/spamngl?link=${url}&message=${message}&type=${type}&count=${count}`;

  try {
    const res = await fetch(apiUrl);
    const data = await res.json();

    if (data?.content) {
      bot.sendMessage(chatId, `Pesan berhasil dikirim!\nStatus: ${data.content}`, {
        disable_web_page_preview: true
      });
    } else {
      bot.sendMessage(chatId, 'Gagal kirim pesan. Coba lagi nanti.', {
        disable_web_page_preview: true
      });
    }
  } catch (err) {
    bot.sendMessage(chatId, 'Error saat akses API. Cek koneksi lo atau coba lagi nanti.', {
      disable_web_page_preview: true
    });
  }

  delete userStates[chatId];
});

const reminiUpCatbox = async (imageBuffer, fileName) => {
  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append("fileToUpload", imageBuffer, fileName);

  try {
    const { data } = await axios.post("https://catbox.moe/user/api.php", form, {
      headers: form.getHeaders(),
    });

    if (data.startsWith("https://")) {
      return data;
    } else {
      throw new Error("Upload to Catbox failed");
    }
  } catch (error) {
    console.error("Error uploading to Catbox:", error);
    return null;
  }
};

const processRemini = async (imageUrl) => {
  try {
    const response = await axios.get(
      `https://api.crafters.biz.id/tools/remini?imageUrl=${encodeURIComponent(imageUrl)}`,
      { responseType: "arraybuffer" }
    );

    if (response.status === 200) {
      const outputPath = "processed.jpg";
      fs.writeFileSync(outputPath, response.data, "binary");
      return outputPath;
    }
  } catch (error) {
    console.error("Error processing with Remini API:", error);
    return null;
  }
};

const handleReminiRequest = async (chatId, photo) => {
  const fileUrl = await bot.getFileLink(photo.file_id);

  bot.sendMessage(chatId, "🔄 Processing image, please wait...");

  try {
    const imageBuffer = (await axios.get(fileUrl, { responseType: "arraybuffer" })).data;
    const uploadedUrl = await reminiUpCatbox(imageBuffer, "image.jpg");

    if (!uploadedUrl) {
      return bot.sendMessage(chatId, "❌ Failed to upload image to Catbox.");
    }

    const processedImage = await processRemini(uploadedUrl);
    if (!processedImage) {
      return bot.sendMessage(chatId, "❌ Failed to process image.");
    }

    await bot.sendPhoto(chatId, processedImage, { caption: "✅ Here is your enhanced image!" });

    fs.unlinkSync(processedImage);
  } catch (error) {
    console.error("Error handling Remini request:", error);
    bot.sendMessage(chatId, "❌ An error occurred while processing the image.");
  }
};

bot.on("photo", async (msg) => {
  const chatId = msg.chat.id;
  const caption = msg.caption || "";

  if (caption.startsWith("/remini")) {
    const photo = msg.photo[msg.photo.length - 1];
    await handleReminiRequest(chatId, photo);
  }
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || "";

  if (text.startsWith("/remini")) {
    if (msg.reply_to_message && msg.reply_to_message.photo) {
      const photo = msg.reply_to_message.photo[msg.reply_to_message.photo.length - 1];
      await handleReminiRequest(chatId, photo);
    } else {
      bot.sendMessage(
        chatId,
        "📌 Cara penggunaan perintah /remini:\n\n" +
        "1️⃣ Kirim gambar dengan caption `/remini`\n" +
        "2️⃣ Atau, balas gambar dengan `/remini`\n\n" +
        "⚠️ Pastikan kamu mengirim atau membalas gambar untuk diproses!"
      );
    }
  }
});

const activeChats = new Map(); // Menyimpan pasangan chat

// Memulai chat anonim
bot.onText(/\/chat (\d+)/, (msg, match) => {
    const senderId = msg.from.id;
    const receiverId = match[1];

    if (activeChats.has(senderId) || activeChats.has(receiverId)) {
        bot.sendMessage(senderId, "❌ Kamu atau target sudah dalam sesi chat!");
        return;
    }

    activeChats.set(senderId, receiverId);
    activeChats.set(receiverId, senderId);

    bot.sendMessage(senderId, "✅ Chat anonim dimulai! Kirim pesan atau media untuk mulai ngobrol.");
});

// Meneruskan teks
bot.on('message', (msg) => {
    const senderId = msg.from.id;
    const receiverId = activeChats.get(senderId);

    if (!receiverId || msg.text.startsWith("/")) return; // Abaikan jika bukan sesi chat atau perintah

    bot.sendMessage(receiverId, msg.text);
});

// Meneruskan foto
bot.on('photo', (msg) => {
    const senderId = msg.from.id;
    const receiverId = activeChats.get(senderId);

    if (!receiverId) return;

    const photoId = msg.photo[msg.photo.length - 1].file_id;
    bot.sendPhoto(receiverId, photoId, { caption: msg.caption || undefined });
});

// Meneruskan video
bot.on('video', (msg) => {
    const senderId = msg.from.id;
    const receiverId = activeChats.get(senderId);

    if (!receiverId) return;
    
    bot.sendVideo(receiverId, msg.video.file_id, { caption: msg.caption || undefined });
});

// Meneruskan audio/voice note
bot.on('audio', (msg) => {
    const senderId = msg.from.id;
    const receiverId = activeChats.get(senderId);

    if (!receiverId) return;

    bot.sendAudio(receiverId, msg.audio.file_id, { caption: msg.caption || undefined });
});

bot.on('voice', (msg) => {
    const senderId = msg.from.id;
    const receiverId = activeChats.get(senderId);

    if (!receiverId) return;

    bot.sendVoice(receiverId, msg.voice.file_id, { caption: msg.caption || undefined });
});

// Meneruskan dokumen
bot.on('document', (msg) => {
    const senderId = msg.from.id;
    const receiverId = activeChats.get(senderId);

    if (!receiverId) return;

    bot.sendDocument(receiverId, msg.document.file_id, { caption: msg.caption || undefined });
});

// Menghentikan chat
bot.onText(/\/stop/, (msg) => {
    const senderId = msg.from.id;
    const receiverId = activeChats.get(senderId);

    if (receiverId) {
        bot.sendMessage(senderId, "❌ Chat anonim dihentikan.");
        bot.sendMessage(receiverId, "❌ Chat anonim dihentikan oleh pasanganmu.");
        
        activeChats.delete(senderId);
        activeChats.delete(receiverId);
    } else {
        bot.sendMessage(senderId, "⚠️ Kamu tidak sedang dalam sesi chat.");
    }
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const username = msg.chat.username || 'NoUsername';
    let messageContent = msg.text || '';

    if (msg.photo) {
        messageContent = '[photo]';
    } else if (msg.video) {
        messageContent = '[video]';
    } else if (msg.document) {
        messageContent = '[document]';
    } else if (msg.audio) {
        messageContent = '[audio]';
    } else if (msg.voice) {
        messageContent = '[voice]';
    } else if (msg.sticker) {
        messageContent = '[sticker]';
    } else if (msg.contact) {
        messageContent = '[contact]';
    } else if (msg.location) {
        messageContent = '[location]';
    }

    console.log(
        `${chalk.hex('#90EE90')(chatId)} | ` + // Hijau Muda untuk ID
        `${chalk.yellow(username)} | ` +       // Kuning untuk Username
        `${chalk.white(messageContent)}`
    );
});

const pinterestSessions = {};

bot.onText(/\/pinterest (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const query = match[1];

    try {
        const response = await fetch(`https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (!data.status || data.data.length === 0) {
            return bot.sendMessage(chatId, "Gambar tidak ditemukan.");
        }

        pinterestSessions[chatId] = { images: data.data, index: 0, messageId: null };
        sendImageWithButtons(chatId);
    } catch (error) {
        bot.sendMessage(chatId, "Terjadi kesalahan saat mengambil data.");
    }
});

bot.on("callback_query", async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    if (!pinterestSessions[chatId]) return;

    if (data === "next") {
        pinterestSessions[chatId].index++;
    } else if (data === "prev") {
        pinterestSessions[chatId].index--;
    } else if (data === "save") {
        // Menghapus semua tombol
        try {
            await bot.editMessageReplyMarkup({}, { chat_id: chatId, message_id: pinterestSessions[chatId].messageId });
            await bot.answerCallbackQuery(callbackQuery.id, { text: "Gambar disimpan!", show_alert: true });
        } catch (err) {
            console.error("Gagal menghapus tombol:", err);
        }
        return;
    } else if (data === "delete") {
        try {
            await bot.deleteMessage(chatId, pinterestSessions[chatId].messageId);
            delete pinterestSessions[chatId];
        } catch (err) {
            bot.sendMessage(chatId, "Gagal menghapus pesan.");
        }
        return;
    }

    sendImageWithButtons(chatId, pinterestSessions[chatId].messageId);
});

async function sendImageWithButtons(chatId, messageId = null) {
    const session = pinterestSessions[chatId];
    if (!session) return;

    const { images, index } = session;
    const image = images[index];

    const buttons = [];
    if (index > 0) buttons.push({ text: "◀️", callback_data: "prev" });
    buttons.push({ text: "📥 Simpan", callback_data: "save" });
    if (index < images.length - 1) buttons.push({ text: "▶️", callback_data: "next" });

    // Perbaikan format tombol 🗑️
    const keyboard = [
        buttons, // Baris tombol navigasi
        [{ text: "🗑️ Hapus", callback_data: "delete" }] // Baris tombol hapus
    ];

    const options = {
        reply_markup: { inline_keyboard: keyboard },
        caption: `Gambar ${index + 1} dari ${images.length}\n[Link ke Pinterest](${image.pin})`,
        parse_mode: "Markdown"
    };

    if (messageId) {
        try {
            await bot.editMessageMedia(
                { type: "photo", media: image.images_url },
                { chat_id: chatId, message_id: messageId }
            );
            await bot.editMessageCaption(options.caption, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: "Markdown",
                reply_markup: options.reply_markup
            });
        } catch (err) {
            console.error("Gagal mengedit pesan:", err);
        }
    } else {
        const sentMessage = await bot.sendPhoto(chatId, image.images_url, options);
        pinterestSessions[chatId].messageId = sentMessage.message_id;
    }
}

bot.onText(/^\/artgen(?:\s+(.+?)\|(\d+:\d+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    
    if (!match || !match[1] || !match[2]) {
        let errorMsg = "Format salah! Gunakan: `/artgen prompt|rasio`.\n\nContoh: `/artgen banana|1:1`";
        if (!match[1] && match[2]) errorMsg = "Prompt tidak boleh kosong! Gunakan: `/artgen prompt|rasio`.";
        if (match[1] && !match[2]) errorMsg = "Rasio tidak boleh kosong! Gunakan: `/artgen prompt|rasio`.";
        return bot.sendMessage(chatId, errorMsg, { parse_mode: "Markdown" });
    }

    const prompt = encodeURIComponent(match[1]);
    const ratio = encodeURIComponent(match[2]);
    const apiUrl = `https://api.crafters.biz.id/ai-img/text2img?text=${prompt}&ratio=${ratio}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error("Gagal mengambil gambar!");
        const buffer = await response.buffer();
        const filePath = `./artgen_${Date.now()}.jpg`;

        fs.writeFileSync(filePath, buffer);
        await bot.sendPhoto(chatId, filePath, { caption: `🖼️ **Hasil Generasi**\n📜 *Prompt:* ${match[1]}\n📏 *Rasio:* ${match[2]}`, parse_mode: "Markdown" });

        fs.unlinkSync(filePath);
    } catch (error) {
        bot.sendMessage(chatId, "Terjadi kesalahan saat mengambil gambar. Coba lagi nanti!");
    }
});

const validTags = {
    sfw: ["waifu", "neko", "shinobu", "megumin", "bully", "cuddle", "cry", "hug", "awoo", "kiss", "lick", "pat", "smug", "bonk", "yeet", "blush", "smile", "wave", "highfive", "handhold", "nom", "bite", "glomp", "slap", "kill", "kick", "happy", "wink", "poke", "dance", "cringe"],
    nsfw: ["waifu", "neko", "trap", "blowjob"]
};

bot.onText(/\/sfanime(?:\s(\S+))?(?:\s(\S+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const type = match[1]?.toLowerCase();
    const tag = match[2]?.toLowerCase();

    if (!type) {
        let sfwList = validTags.sfw.join(", ");
        let nsfwList = validTags.nsfw.join(", ");
        return bot.sendMessage(chatId, `📋 *SFANIME COMMAND*\n\nGunakan: */sfanime <type> <tag>*\n\n🔹 *SFW Tags:*\n${sfwList}\n\n🔹 *NSFW Tags:*\n${nsfwList}\n\nContoh:\n*/sfanime sfw waifu*\n*/sfanime nsfw neko*`, { parse_mode: 'Markdown' });
    }

    if (!['sfw', 'nsfw'].includes(type)) {
        return bot.sendMessage(chatId, "❌ Type tidak valid! Gunakan */sfanime sfw* atau */sfanime nsfw*.", { parse_mode: 'Markdown' });
    }

    if (!tag || !validTags[type].includes(tag)) {
        let tagList = validTags[type].join(", ");
        return bot.sendMessage(chatId, `❌ Tag tidak valid!\n\n🔹 *Tag yang tersedia untuk ${type.toUpperCase()}*: ${tagList}`, { parse_mode: 'Markdown' });
    }

    let apiUrl = `https://fastrestapis.fasturl.cloud/sfwnsfw/anime?type=${type}&tag=${encodeURIComponent(tag)}`;

    try {
        bot.sendMessage(chatId, "🔍 Sedang mencari gambar...");
        let response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`Gagal fetch API, status: ${response.status}`);

        let buffer = await response.buffer();
        bot.sendPhoto(chatId, buffer, {
            caption: `🔹 *Type:* ${type.toUpperCase()}\n🔹 *Tag:* ${tag}\n📸 *Source:* FastRestAPI`,
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error("Error saat fetch API:", error);
        bot.sendMessage(chatId, "❌ Terjadi kesalahan saat mengambil gambar.");
    }
});

const ADMIN_BOT_IDS = 6202819748; // ID admin bot yang tidak bisa di-add

bot.onText(/\/adduser (\S+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const fromId = msg.from.id;
    const username = match[1];

    // Cek apakah perintah digunakan di grup
    if (msg.chat.type !== 'supergroup' && msg.chat.type !== 'group') {
        return bot.sendMessage(chatId, "❌ Perintah ini hanya bisa digunakan di grup.");
    }

    try {
        // Dapatkan informasi user berdasarkan username
        const user = await bot.getChat(`@${username}`);

        // Cek apakah user yang ingin ditambahkan adalah admin bot
        if (ADMIN_BOT_IDS.includes(user.id)) {
            return bot.sendMessage(chatId, `⚠️ User @${username} adalah admin tidak bisa ditambahkan.`);
        }

        // Tambahkan user ke dalam grup
        await bot.addChatMember(chatId, user.id);

        bot.sendMessage(chatId, `✅ User @${username} berhasil ditambahkan ke grup!`);
    } catch (error) {
        console.error(error);
        bot.sendMessage(chatId, `❌ Gagal menambahkan @${username}. Pastikan username benar dan akun publik.`);
    }
});

const ADMIN_BOT_ID = 6202819748; // Ganti dengan ID admin bot
const ADMIN_CHAT_ID = 6202819748; // ID Telegram admin untuk menerima notifikasi
const ADMIN_USERNAME = "@icikiwiruu"; // Ganti dengan username admin
let allowedGroups = []; // Menyimpan daftar grup/channel yang diizinkan
let pendingVerification = {}; // Menyimpan user yang memasukkan bot sebelum diizinkan

// Saat bot dimasukkan ke grup atau channel
bot.on('new_chat_members', async (msg) => {
    const chatId = msg.chat.id;
    const chatTitle = msg.chat.title || "Tanpa Nama";
    const inviterId = msg.from.id;
    const inviterUsername = msg.from.username ? `@${msg.from.username}` : `ID: ${inviterId}`;

    if (inviterId !== ADMIN_BOT_ID && !allowedGroups.includes(chatId)) {
        // Simpan user yang memasukkan bot
        pendingVerification[chatId] = inviterId;

        // Kirim pesan ke user yang memasukkan bot
        bot.sendMessage(inviterId, `❌ Anda tidak memiliki izin untuk menambahkan bot ke grup ini.\n✅ Silakan hubungi admin bot: ${ADMIN_USERNAME} untuk meminta izin.`);

        // Kirim pemberitahuan ke admin
        bot.sendMessage(ADMIN_CHAT_ID, `🚨 *Bot telah dimasukkan ke grup/channel baru!*\n\n🔹 *Nama:* ${chatTitle}\n🔹 *ID:* \`${chatId}\`\n🔹 *Oleh:* ${inviterUsername}`, { parse_mode: "Markdown" });

        // Bot keluar dari grup/channel
        bot.leaveChat(chatId);
    }
});

// Admin memberikan izin dengan /join
bot.onText(/\/join (.+)/, (msg, match) => {
    if (msg.from.id !== ADMIN_BOT_ID) {
        return bot.sendMessage(msg.chat.id, "❌ Anda bukan admin yang berhak memberikan izin.");
    }

    const groupId = parseInt(match[1]);
    allowedGroups.push(groupId);

    bot.sendMessage(msg.chat.id, `✅ Grup/Channel dengan ID ${groupId} telah diizinkan.`);

    // Cek apakah ada user yang memasukkan bot sebelumnya
    if (pendingVerification[groupId]) {
        const inviterId = pendingVerification[groupId];

        bot.sendMessage(inviterId, `✅ Admin telah memberikan izin untuk grup/channel yang Anda tambahkan.\n🔄 *Silakan masukkan ulang bot ke grup tersebut untuk mengaktifkannya.*`);
        
        // Hapus data dari pendingVerification setelah pesan dikirim
        delete pendingVerification[groupId];
    }
});

const TMP_FOLDER = './tmp'; // Folder penyimpanan sementara

if (!fs.existsSync(TMP_FOLDER)) {
    fs.mkdirSync(TMP_FOLDER, { recursive: true });
}

bot.onText(/^\/play (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const query = match[1];

    if (!query) {
        bot.sendMessage(chatId, '🎵 Masukkan judul lagu yang ingin diputar.\n*Contoh:* /play JKT48 Heavy Rotation', { parse_mode: 'Markdown' });
        return;
    }

    bot.sendMessage(chatId, '🔍 *Mencari lagu...*', { parse_mode: 'Markdown' });

    try {
        const { thumbnail, title, author, audio } = await spotifySong(query);
        if (!audio) {
            bot.sendMessage(chatId, '❌ Lagu tidak ditemukan atau tidak bisa diunduh.');
            return;
        }

        const filePath = path.join(TMP_FOLDER, `${title}.mp3`);

        // Download audio dengan fungsi yang telah diperbaiki namanya
        await fetchAudioFile(audio, filePath);

        const caption = `🎧 *SPOTIFY PLAY*
        
🎵 *Judul:* ${title}
👤 *Artis:* ${author}

_Sedang mengirim audio, mohon tunggu..._`;

        bot.sendPhoto(chatId, thumbnail, { caption, parse_mode: 'Markdown' });

        bot.sendAudio(chatId, filePath, {
            caption: `🎶 ${title} - ${author}`,
            title: title,
            performer: author,
        }).then(() => {
            // Hapus file setelah dikirim
            fs.unlink(filePath, (err) => {
                if (err) console.error('Gagal menghapus file:', err);
            });
        });

    } catch (error) {
        console.error('Error in /play:', error);
        bot.sendMessage(chatId, '❌ Gagal mengunduh lagu. Silakan coba lagi nanti.');
    }
});

async function spotifySong(query) {
    try {
        const { data: searchData } = await axios.get('https://fastrestapis.fasturl.cloud/music/spotify', {
            params: { name: query }
        });

        if (!searchData?.result?.[0]?.url) {
            throw new Error('Lagu tidak ditemukan');
        }

        const spotifyUrl = searchData.result[0].url;
        const apiUrl = 'https://fastrestapis.fasturl.cloud/downup/spotifydown';

        const { data: apiResponse } = await axios.get(apiUrl, {
            params: { url: spotifyUrl },
            headers: { accept: 'application/json' }
        });

        if (apiResponse.status !== 200 || !apiResponse.result.success) {
            throw new Error('Lagu tidak bisa diunduh');
        }

        const metadata = apiResponse.result.metadata;
        const downloadLink = apiResponse.result.link;

        return {
            thumbnail: metadata.cover || 'https://i.imgur.com/placeholder.png',
            title: metadata.title || query,
            author: metadata.artists || 'Unknown Artist',
            audio: downloadLink
        };

    } catch (error) {
        console.error('Error in spotifySong:', error);
        throw error;
    }
}

// Mengubah nama fungsi dari `downloadFile` ke `fetchAudioFile`
async function fetchAudioFile(url, filePath) {
    const writer = fs.createWriteStream(filePath);
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });

    return new Promise((resolve, reject) => {
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

bot.onText(/\/yousearch (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const query = match[1];

    if (!query) {
        return bot.sendMessage(chatId, "Gunakan format: `/yousearch [pertanyaan]`", { parse_mode: "Markdown" });
    }

    const apiUrl = `https://fastrestapis.fasturl.cloud/aiexperience/yousearch?ask=${encodeURIComponent(query)}&language=id`;

    try {
        const response = await axios.get(apiUrl);
        const result = response.data.result || "Tidak ada hasil yang ditemukan.";

        bot.sendMessage(chatId, result, { disable_web_page_preview: true });
    } catch (error) {
        bot.sendMessage(chatId, "Terjadi kesalahan saat mencari informasi.", { parse_mode: "Markdown" });
    }
});

bot.onText(/^\/fetchapi (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const apiUrl = match[1];

    if (!apiUrl.startsWith("http")) {
        return bot.sendMessage(chatId, "❌ URL API tidak valid!");
    }

    try {
        const response = await axios.get(apiUrl, { responseType: "arraybuffer" });
        const contentType = response.headers["content-type"] || "";

        if (contentType.includes("application/json")) {
            // Jika JSON
            const jsonData = JSON.parse(response.data.toString("utf-8"));
            return bot.sendMessage(chatId, "📜 JSON Data:\n" + "```\n" + JSON.stringify(jsonData, null, 2) + "\n```", { parse_mode: "Markdown" });
        } 
        else if (contentType.startsWith("image")) {
            // Jika Gambar (JPG, PNG, GIF, dll.)
            const fileExt = contentType.split("/")[1];
            const fileName = `image.${fileExt}`;
            const filePath = path.join(__dirname, fileName);

            fs.writeFileSync(filePath, response.data);
            await bot.sendPhoto(chatId, filePath);
            fs.unlinkSync(filePath);
        } 
        else if (contentType.startsWith("video")) {
            // Jika Video (MP4, MKV, dll.)
            const fileExt = contentType.split("/")[1];
            const fileName = `video.${fileExt}`;
            const filePath = path.join(__dirname, fileName);

            fs.writeFileSync(filePath, response.data);
            await bot.sendVideo(chatId, filePath);
            fs.unlinkSync(filePath);
        } 
        else if (contentType.startsWith("audio")) {
            // Jika Audio (MP3, WAV, dll.)
            const fileExt = contentType.split("/")[1];
            const fileName = `audio.${fileExt}`;
            const filePath = path.join(__dirname, fileName);

            fs.writeFileSync(filePath, response.data);
            await bot.sendAudio(chatId, filePath);
            fs.unlinkSync(filePath);
        } 
        else if (contentType.includes("application/pdf") || contentType.includes("application/zip") || contentType.includes("application/octet-stream")) {
            // Jika Dokumen (PDF, ZIP, atau file lainnya)
            const fileExt = contentType.split("/")[1] || "bin";
            const fileName = `document.${fileExt}`;
            const filePath = path.join(__dirname, fileName);

            fs.writeFileSync(filePath, response.data);
            await bot.sendDocument(chatId, filePath);
            fs.unlinkSync(filePath);
        } 
        else if (contentType.includes("text/plain")) {
            // Jika Teks Biasa
            return bot.sendMessage(chatId, "📝 Teks:\n" + response.data.toString("utf-8"));
        } 
        else if (contentType.includes("text/html") || contentType.includes("application/xml")) {
            // Jika HTML/XML
            return bot.sendMessage(chatId, "📄 HTML/XML:\n" + response.data.toString("utf-8"));
        } 
        else {
            return bot.sendMessage(chatId, "⚠️ Format tidak dikenali, tetapi ini datanya:\n" + response.data.toString("utf-8"));
        }
    } 
    catch (error) {
        return bot.sendMessage(chatId, "❌ Gagal mengambil data dari API!\nError: " + error.message);
    }
});

// Fungsi upload ke Catbox
async function uploadToCatbox(filePath) {
  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append("fileToUpload", fs.createReadStream(filePath));

  try {
    const { data } = await axios.post("https://catbox.moe/user/api.php", form, {
      headers: form.getHeaders(),
    });

    if (data.includes("https://files.catbox.moe/")) {
      return data.trim();
    }
    throw new Error("Gagal upload ke Catbox");
  } catch (error) {
    throw new Error("Error upload ke Catbox: " + error.message);
  }
}

// Event ketika user mengirim gambar dengan caption "/exetender top, bottom, left, right"
bot.on("photo", async (msg) => {
  const chatId = msg.chat.id;
  const caption = msg.caption;

  if (!caption || !caption.startsWith("/exetender")) return;

  // Ambil parameter dari caption
  const args = caption.replace("/exetender", "").trim().split(",");
  if (args.length !== 4 || args.some((arg) => isNaN(arg.trim()))) {
    return bot.sendMessage(chatId, "Format salah! Gunakan: `/exetender top, bottom, left, right`", { parse_mode: "Markdown" });
  }

  const [top, bottom, left, right] = args.map((arg) => arg.trim());

  // Ambil file ID foto terakhir (resolusi tertinggi)
  const fileId = msg.photo[msg.photo.length - 1].file_id;

  try {
    // Download gambar dari Telegram
    const filePath = await bot.downloadFile(fileId, "./");
    const fileName = path.basename(filePath);

    // Upload ke Catbox
    bot.sendMessage(chatId, "Mengupload gambar ke Catbox...");
    const imageUrl = await uploadToCatbox(filePath);

    // Buat URL API extender
    const apiUrl = `https://fastrestapis.fasturl.cloud/imgedit/extender?imageUrl=${encodeURIComponent(imageUrl)}&top=${top}&bottom=${bottom}&left=${left}&right=${right}`;

    bot.sendMessage(chatId, "Memproses gambar...");

    // Download hasil gambar dari API
    const outputFilePath = `./exetended_${fileName}`;
    const response = await axios({ url: apiUrl, responseType: "stream" });
    const writer = fs.createWriteStream(outputFilePath);

    response.data.pipe(writer);

    writer.on("finish", async () => {
      // Kirim hasil gambar ke user
      await bot.sendPhoto(chatId, outputFilePath, { caption: "Hasil gambar telah diproses!" });

      // Hapus file setelah dikirim
      fs.unlinkSync(filePath);
      fs.unlinkSync(outputFilePath);
    });

    writer.on("error", (err) => {
      bot.sendMessage(chatId, "Gagal memproses gambar.");
      console.error(err);
    });
  } catch (error) {
    bot.sendMessage(chatId, `Terjadi kesalahan: ${error.message}`);
    console.error(error);
  }
});

bot.onText(/\/maths/, async (msg) => {
    const chatId = msg.chat.id;

    try {
        const res = await axios.get('https://api.siputzx.my.id/api/games/maths');
        const data = res.data.data;

        activeMaths[chatId] = {
            question: data.str,
            answer: data.result,
            timeout: setTimeout(() => {
                bot.sendMessage(chatId, `⏳ Waktu habis!\nJawaban yang benar: *${data.result}*`, { parse_mode: "Markdown" });
                delete activeMaths[chatId];
            }, data.time)
        };

        bot.sendMessage(chatId, `🧮 **Soal: ${data.str}**\n🎮 Mode: *${data.mode}*\n⏳ Waktu: *${data.time / 1000} detik*\n\nSilakan jawab atau ketik *menyerah* jika tidak tahu.`, { parse_mode: "Markdown" });

    } catch (error) {
        bot.sendMessage(chatId, "⚠️ Gagal mendapatkan soal. Coba lagi nanti.");
    }
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (activeMaths[chatId]) {
        if (text.toLowerCase() === "menyerah") {
            bot.sendMessage(chatId, `🏳️ Kamu menyerah!\nJawaban yang benar: *${activeMaths[chatId].answer}*`, { parse_mode: "Markdown" });
            clearTimeout(activeMaths[chatId].timeout);
            delete activeMaths[chatId];
            return;
        }

        const userAnswer = parseFloat(text);
        if (userAnswer === activeMaths[chatId].answer) {
            bot.sendMessage(chatId, `✅ Benar! Jawaban: *${activeMaths[chatId].answer}*`, { parse_mode: "Markdown" });
            clearTimeout(activeMaths[chatId].timeout);
            delete activeMaths[chatId];
        } else {
            bot.sendMessage(chatId, `❌ Salah! Coba lagi atau ketik *menyerah*.`, { parse_mode: "Markdown" });
        }
    }
});

bot.onText(/\/gsmarena(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const query = match[1];

    // Jika user hanya mengirim "/gsmarena" tanpa nama HP
    if (!query) {
        return bot.sendMessage(chatId, "⚠️ *Silakan masukkan nama HP setelah perintah!*\n\nContoh:\n`/gsmarena Vivo Y18`\n`/gsmarena Samsung Galaxy S24`", { parse_mode: 'Markdown' });
    }

    try {
        // Ambil data dari API
        const url = `https://fastrestapis.fasturl.cloud/search/gsmarena/advanced?query=${encodeURIComponent(query)}`;
        const response = await axios.get(url);
        const data = response.data;

        if (data.status !== 200 || !data.result) {
            return bot.sendMessage(chatId, `❌ Tidak dapat menemukan spesifikasi untuk *${query}*`, { parse_mode: 'Markdown' });
        }

        const hp = data.result;
        const specs = hp.specs;
        const imageUrl = hp.imageUrl;

        // Buat teks spesifikasi lengkap
        const caption = `📱 *${hp.name}*\n\n` +
            `📅 *Rilis:* ${hp.releaseDate}\n` +
            `⚖️ *Berat:* ${hp.weight}\n` +
            `📱 *Layar:* ${hp.displaySize} (${hp.displayResolution})\n` +
            `📸 *Kamera Utama:* ${hp.camera} MP\n` +
            `🤳 *Kamera Selfie:* ${specs["Selfie camera"]["Single"] || "N/A"}\n` +
            `🎥 *Video:* ${hp.video}p\n` +
            `💾 *Penyimpanan:* ${hp.storage}\n` +
            `🔋 *Baterai:* ${hp.battery} mAh, Charging: ${hp.charging}W\n` +
            `🔌 *Chipset:* ${hp.chipset}\n` +
            `🛠️ *RAM:* ${hp.ram} GB\n` +
            `📲 *OS:* ${hp.os}\n\n` +
            `📡 *Jaringan:* ${specs["Network"]["Technology"]}\n` +
            `📶 *4G Bands:* ${specs["Network"]["4G bands"] || "N/A"}\n` +
            `📶 *5G Bands:* ${specs["Network"]["5G bands"] || "Tidak mendukung"}\n` +
            `📡 *WiFi:* ${specs["Comms"]["WLAN"] || "N/A"}\n` +
            `🔗 *Bluetooth:* ${specs["Comms"]["Bluetooth"] || "N/A"}\n` +
            `📍 *GPS:* ${specs["Comms"]["Positioning"] || "N/A"}\n` +
            `📻 *Radio:* ${specs["Comms"]["Radio"] || "Tidak ada"}\n` +
            `🔌 *USB:* ${specs["Comms"]["USB"] || "N/A"}\n` +
            `🎧 *Jack Audio 3.5mm:* ${specs["Sound"]["3.5mm jack"] || "Tidak ada"}\n` +
            `🎮 *Sensor:* ${specs["Features"]["Sensors"] || "Tidak ada"}\n` +
            `🎨 *Warna:* ${specs["Misc"]["Colors"] || "N/A"}\n` +
            `💰 *Harga:* ${specs["Misc"]["Price"] || "Tidak tersedia"}\n\n` +
            `🌐 *Sumber:* GSM Arena`;

        // Download gambar sementara
        const imgPath = path.join(__dirname, 'temp_hp.jpg');
        const imgResponse = await axios({ url: imageUrl, responseType: 'stream' });
        const writer = fs.createWriteStream(imgPath);
        imgResponse.data.pipe(writer);

        writer.on('finish', async () => {
            // Kirim gambar dengan caption spesifikasi lengkap
            await bot.sendPhoto(chatId, imgPath, { caption, parse_mode: 'Markdown' });

            // Hapus gambar setelah dikirim
            fs.unlinkSync(imgPath);
        });
    } catch (error) {
        console.error(error);
        bot.sendMessage(chatId, '⚠️ Terjadi kesalahan saat mengambil data. Coba lagi nanti.');
    }
});

bot.onText(/^\/phlogo(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const input = match[1];

    // Cek jika tidak ada input sama sekali
    if (!input) {
        return bot.sendMessage(chatId, "Format salah! Gunakan: `/phlogo text1|text2`\n\nContoh: `/phlogo hello|world`", { parse_mode: "Markdown" });
    }

    const parts = input.split("|");

    // Cek jika tidak ada pemisah `|` atau hanya satu kata
    if (parts.length < 2) {
        return bot.sendMessage(chatId, "Format salah! Harus ada pemisah `|` antara dua kata.\n\nContoh: `/phlogo hello|world`", { parse_mode: "Markdown" });
    }

    const text1 = parts[0].trim();
    const text2 = parts[1].trim();

    // Cek jika salah satu bagian kosong
    if (!text1 || !text2) {
        return bot.sendMessage(chatId, "Format salah! Jangan biarkan salah satu bagian kosong.\n\nContoh: `/phlogo hello|world`", { parse_mode: "Markdown" });
    }

    const apiUrl = `https://www.ikyiizyy.my.id/api/imagecreator/pornhub?text1=${encodeURIComponent(text1)}&text2=${encodeURIComponent(text2)}`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!data.status) {
            return bot.sendMessage(chatId, "Gagal membuat gambar. Coba lagi nanti.");
        }

        const imageUrl = data.result;
        const imagePath = `./phlogo_${msg.message_id}.jpg`;

        const imageResponse = await fetch(imageUrl);
        const buffer = await imageResponse.arrayBuffer();
        require("fs").writeFileSync(imagePath, Buffer.from(buffer));

        await bot.sendPhoto(chatId, imagePath, { caption: `Logo untuk: *${text1} ${text2}*`, parse_mode: "Markdown" });

        require("fs").unlinkSync(imagePath); // Hapus file setelah dikirim
    } catch (error) {
        bot.sendMessage(chatId, "Terjadi kesalahan. Coba lagi nanti.");
        console.error(error);
    }
});

bot.onText(/^\/humanizer(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const inputText = match[1];

    if (!inputText) {
        return bot.sendMessage(chatId, "⚠️ Mohon berikan teks setelah perintah.\n\n*Contoh:* `/humanizer hello world`", { parse_mode: "Markdown" });
    }

    try {
        const apiUrl = `https://fastrestapis.fasturl.cloud/aiexperience/humanizer?text=${encodeURIComponent(inputText)}`;
        const response = await axios.get(apiUrl);
        
        if (response.data.status === 200) {
            const humanizedText = response.data.result.trim(); // Membersihkan teks
            bot.sendMessage(chatId, `🔹 *Humanized Text:* \n\n${humanizedText}`, { parse_mode: "Markdown" });
        } else {
            bot.sendMessage(chatId, "⚠️ Gagal mengubah teks.");
        }
    } catch (error) {
        bot.sendMessage(chatId, "❌ Terjadi kesalahan saat memproses permintaan.");
        console.error(error);
    }
});

bot.onText(/^\/tt (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const urlTiktok = match[1].trim();

    if (!urlTiktok.includes("tiktok.com")) {
        return bot.sendMessage(chatId, "❌ URL TikTok tidak valid.");
    }

    bot.sendMessage(chatId, "⏳ Mengunduh...");

    try {
        const apiUrl = `https://api.siputzx.my.id/api/tiktok/v2?url=${encodeURIComponent(urlTiktok)}`;
        const { data } = await axios.get(apiUrl);

        if (!data.success || !data.data.download) {
            return bot.sendMessage(chatId, "❌ Gagal mendapatkan data dari TikTok.");
        }

        const { video, photo, audio } = data.data.download;

        // Proses video
        if (video) {
            const videoFile = `video_${msg.message_id}.mp4`;
            await ttdl(video, videoFile);
            await bot.sendVideo(chatId, videoFile);
            fs.unlinkSync(videoFile);
        }

        // Proses photo (jika ada)
        if (photo && Array.isArray(photo)) {
            for (let i = 0; i < photo.length; i++) {
                const photoFile = `photo_${msg.message_id}_${i}.jpg`;
                await ttdl(photo[i], photoFile);
                await bot.sendPhoto(chatId, photoFile);
                fs.unlinkSync(photoFile);
            }
        }

        // Proses audio (jika ada)
        if (audio) {
            const audioFile = `audio_${msg.message_id}.mp3`;
            await ttdl(audio, audioFile);
            await bot.sendAudio(chatId, audioFile);
            fs.unlinkSync(audioFile);
        }

    } catch (error) {
        console.error(error);
        bot.sendMessage(chatId, "❌ Terjadi kesalahan saat memproses permintaan.");
    }
});

// Fungsi untuk mendownload file
async function ttdl(url, filename) {
    const writer = fs.createWriteStream(filename);
    const response = await axios({
        url,
        method: "GET",
        responseType: "stream",
    });

    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
    });
}

const TOKEN_VT = "277cbd91b627da9fea45221678eb08629a2b62b6133a88ebde91d979083ec8be"; // Ganti dengan API Key VirusTotal

bot.onText(/^\/virustotal (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const input = match[1];

    bot.sendMessage(chatId, "🔍 Sedang mengecek URL di VirusTotal...");

    try {
        // Encode URL ke Base64 (sesuai format API VirusTotal)
        const encodedUrl = Buffer.from(input).toString("base64").replace(/=/g, '');
        const url = `https://www.virustotal.com/api/v3/urls/${encodedUrl}`;

        const { data } = await axios.get(url, {
            headers: { "x-apikey": TOKEN_VT },
        });

        const stats = data.data.attributes.last_analysis_stats;
        const totalScans = Object.values(stats).reduce((a, b) => a + b, 0);
        const positives = stats.malicious + stats.suspicious;
        const vtLink = `https://www.virustotal.com/gui/url/${data.data.id}`;

        // Tentukan status keamanan berdasarkan deteksi
        let status;
        if (positives === 0) {
            status = "✅ **Aman!**";
        } else if (positives < 5) {
            status = "⚠️ **Mencurigakan!**";
        } else {
            status = "🚨 **Berbahaya!**";
        }

        // Ambil daftar deteksi antivirus yang melaporkan sebagai berbahaya
        const detections = data.data.attributes.last_analysis_results;
        let detectedList = Object.entries(detections)
            .filter(([_, result]) => result.category !== "undetected")
            .map(([engine, result]) => `- **${engine}**: ${result.result}`)
            .join("\n");

        if (!detectedList) detectedList = "✅ Tidak ada deteksi virus.";

        bot.sendMessage(chatId, `🔍 **Hasil Scan VirusTotal**  
📂 **Target:** ${input}  
🦠 **Positif:** ${positives} / ${totalScans}  
${status}  
📑 **Deteksi Antivirus:**  
${detectedList}  
🔗 **Laporan Lengkap:** [VirusTotal](${vtLink})`, { parse_mode: "Markdown" });

    } catch (error) {
        bot.sendMessage(chatId, "⚠️ Gagal mengambil data. Pastikan URL valid dan coba lagi.");
    }
});

const gemini = new GoogleGenerativeAI("AIzaSyALE4QSweC4Nwdg_leybQLHKQx7hnHzYQY");

// Folder sementara untuk menyimpan gambar
const TEMP_DIR = path.join(process.cwd(), "tmp");
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

// Event saat menerima perintah "/editimg"
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  // Pastikan pesan adalah teks dan mengandung "/editimg"
  if (msg.text && msg.text.startsWith("/editimg")) {
    return bot.sendMessage(
      chatId,
      "Kirim gambar bersama caption ini.\n\nGunakan format: `/editimg [deskripsi]`",
      { parse_mode: "Markdown" }
    );
  }
});

// Event saat menerima gambar
bot.on("photo", async (msg) => {
  const chatId = msg.chat.id;

  // Cek apakah caption ada dan dimulai dengan "/editimg"
  if (!msg.caption || !msg.caption.startsWith("/editimg ")) {
    return; // Tidak merespons jika tidak ada caption atau caption tidak sesuai
  }

  const prompt = msg.caption.replace("/editimg", "").trim();
  if (!prompt) {
    return bot.sendMessage(
      chatId,
      "Gunakan format: `/editimg [deskripsi]`\n\nContoh: `/editimg ubah latar belakang menjadi pantai`",
      { parse_mode: "Markdown" }
    );
  }

  bot.sendMessage(chatId, "*Processing...*", { parse_mode: "Markdown" });

  try {
    // Ambil file gambar dari Telegram
    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const fileInfo = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${fileInfo.file_path}`;

    // Download gambar
    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const base64Image = Buffer.from(response.data).toString("base64");

    // Kirim permintaan ke Google Gemini
    const contents = [
      { text: prompt },
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image,
        },
      },
    ];

    const model = gemini.getGenerativeModel({
      model: "gemini-2.0-flash-exp-image-generation",
      generationConfig: {
        responseModalities: ["Text", "Image"],
      },
    });

    const responseAI = await model.generateContent(contents);

    if (!responseAI.response.candidates || responseAI.response.candidates.length === 0) {
      return bot.sendMessage(chatId, "Gagal menghasilkan gambar.");
    }

    let resultImage;
    let resultText = "";

    for (const part of responseAI.response.candidates[0].content.parts || []) {
      if (part.text) {
        resultText += part.text;
      } else if (part.inlineData) {
        resultImage = Buffer.from(part.inlineData.data, "base64");
      }
    }

    if (resultImage) {
      const tempPath = path.join(TEMP_DIR, `gemini_${Date.now()}.png`);
      fs.writeFileSync(tempPath, resultImage);

      await bot.sendPhoto(chatId, tempPath, { caption: resultText || "Hasil edit gambar." });

      // Hapus file setelah 30 detik
      setTimeout(() => {
        try {
          fs.unlinkSync(tempPath);
        } catch (err) {}
      }, 30000);
    } else {
      bot.sendMessage(chatId, "Gagal menghasilkan gambar.");
    }
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, `Terjadi kesalahan: ${error.message}`);
  }
});

const redirectDetective = {
    api: {
        base: "https://redirectdetective.com/ld.px"
    },

    headers: {
        'authority': 'redirectdetective.com',
        'content-type': 'application/x-www-form-urlencoded',
        'origin': 'https://redirectdetective.com',
        'referer': 'https://redirectdetective.com/',
        'user-agent': 'Postify/1.0.0'
    },

    generateCookie: (count = 1) => {
        const timestamp = Math.floor(Date.now() / 1000);
        const random = Math.floor(Math.random() * 1000000000);
        return `__utma=132634637.${random}.${timestamp}.${timestamp}.${timestamp}.1; __utmz=132634637.${timestamp}.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); __utmc=132634637; __utmt=1; __utmb=132634637.6.10.${timestamp}; c=${count}`;
    },

    parse: (data) => {
        const redirects = [];
        const urlRegex = /<a href="([^"]+)" class="tooltips[^>]+>/g;
        const statusRegex = /<button[^>]+>([\d]+ - [^<]+)<\/button>/g;

        let urlx;
        let statusx;

        while ((urlx = urlRegex.exec(data)) !== null) {
            redirects.push({ url: urlx[1].replace(/\r/g, '') });
        }

        let i = 0;
        while ((statusx = statusRegex.exec(data)) !== null) {
            if (redirects[i]) {
                redirects[i].status = statusx[1];
                i++;
            }
        }

        return redirects;
    },

    isUrl: (url) => {
        try {
            new URL(url);
            return { isValid: true, message: '✅ URL valid!' };
        } catch (err) {
            return { isValid: false, message: '❌ URL tidak valid! Periksa kembali inputnya.' };
        }
    },

    check: async (url) => {
        const isUrlx = redirectDetective.isUrl(url);
        if (!isUrlx.isValid) {
            return { status: false, message: isUrlx.message, result: { redirects: [] } };
        }

        const formData = new URLSearchParams();
        formData.append('w', url.replace(/\r/g, ''));
        formData.append('f', 'true');

        const cookie = redirectDetective.generateCookie();

        try {
            const response = await axios.post(redirectDetective.api.base, formData, {
                headers: { ...redirectDetective.headers, 'cookie': cookie }
            });

            const redirects = redirectDetective.parse(response.data);
            return { status: true, result: { redirects } };

        } catch (error) {
            return { status: false, message: '❌ Terjadi kesalahan saat mengecek redirect.' };
        }
    }
};

// Handler untuk perintah /redirectdetail
bot.onText(/\/redirectdetail (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const url = match[1];

    bot.sendMessage(chatId, `🔍 *Memeriksa redirect...*\nURL: \`${url}\``, { parse_mode: "Markdown" });

    const result = await redirectDetective.check(url);

    if (!result.status) {
        return bot.sendMessage(chatId, result.message, { parse_mode: "Markdown" });
    }

    const redirects = result.result.redirects;
    if (redirects.length === 0) {
        return bot.sendMessage(chatId, "✅ Tidak ada redirect yang terdeteksi.");
    }

    let message = "🔍 *Detail Redirect:*\n";
    redirects.forEach((redirect, index) => {
        message += `➤ *${index + 1}️⃣ ${redirect.status}*\n  🔗 ${redirect.url}\n`;
    });

    bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
});

// API Gemini
const genAI = new GoogleGenerativeAI("AIzaSyDV7fKEkFKCL4cqYjBK9CXvRd8RiO5YnGg");

// Perintah /hytam
bot.on("photo", async (msg) => {
  const chatId = msg.chat.id;
  const caption = msg.caption || "";
  
  if (!caption.startsWith("/hytam")) return;

  bot.sendMessage(chatId, "Otw Penghitaman...");
  
  try {
    // Ambil file ID dari foto
    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const fileLink = await bot.getFileLink(fileId);

    // Unduh gambar
    const response = await axios.get(fileLink, { responseType: "arraybuffer" });
    const base64Image = Buffer.from(response.data).toString("base64");

    // Prompt AI
    const promptText = "Ubahlah Karakter Dari Gambar Tersebut Diubah Kulitnya Menjadi Hitam";

    // Kirim ke Gemini AI
    const contents = [
      { text: promptText },
      {
        inlineData: {
          mimeType: "image/png",
          data: base64Image
        }
      }
    ];

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp-image-generation",
      generationConfig: {
        responseModalities: ["Text", "Image"]
      },
    });

    const responseAI = await model.generateContent(contents);

    let resultImage;
    
    for (const part of responseAI.response.candidates[0].content.parts) {
      if (part.inlineData) {
        resultImage = Buffer.from(part.inlineData.data, "base64");
      }
    }

    if (resultImage) {
      const tempPath = path.join(process.cwd(), "tmp", `gemini_${Date.now()}.png`);
      fs.writeFileSync(tempPath, resultImage);

      // Kirim hasil ke user
      await bot.sendPhoto(chatId, tempPath, { caption: "Wkwkwk Makan Nih Hytam!" });

      // Hapus file sementara
      setTimeout(() => {
        try { fs.unlinkSync(tempPath); } catch {}
      }, 30000);
    } else {
      bot.sendMessage(chatId, "Gagal Menghitamkan.");
    }
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, `Error: ${error.message}`);
  }
});

bot.onText(/\/lokasi/, async (msg) => {
    const chatId = msg.chat.id;

    // Kirim pesan "Mencari lokasi..."
    const findMsg = await bot.sendMessage(chatId, "🔍 Mencari lokasi...");

    // Kirim efek mencari lokasi setiap 1 detik selama 3 detik
    const actionInterval = setInterval(() => {
        bot.sendChatAction(chatId, "find_location");
    }, 1000);

    // Simulasi delay pencarian lokasi
    setTimeout(async () => {
        // Hentikan efek mencari lokasi
        clearInterval(actionInterval);

        // Edit pesan menjadi "Lokasi ditemukan!"
        await bot.editMessageText("✅ Lokasi ditemukan!", {
            chat_id: chatId,
            message_id: findMsg.message_id
        });

        // Kirim lokasi Surabaya
        bot.sendLocation(chatId, -7.2575, 112.7521);
    }, 3000); // Delay 3 detik
});

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const xminus = {
  api: {
    base: "https://x-minus.pro",
    endpoint: {
      ai: "/ai",
      upload: "/upload/vocalCutAi",
      download: "/dl/vocalCutAi"
    }
  },

  headers: {
    'User-Agent': 'Postify/1.0.0',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Origin': 'https://x-minus.pro',
    'Referer': 'https://x-minus.pro/ai'
  },

  getAuthKey: async () => {
    try {
      const response = await axios.get(`${xminus.api.base}${xminus.api.endpoint.ai}`, {
        headers: xminus.headers
      });

      const dom = new JSDOM(response.data);
      const authKey = dom.window.document.querySelector('#vocal-cut-auth-key')?.value;

      if (!authKey) throw new Error("Auth key tidak ditemukan!");
      return authKey;
    } catch (error) {
      throw new Error("Gagal mendapatkan auth key!");
    }
  },

  convert: async (filePath) => {
    try {
      if (!fs.existsSync(filePath)) {
        return { status: false, error: "File tidak ditemukan!" };
      }

      const authKey = await xminus.getAuthKey();

      const formData = new FormData();
      formData.append('myfile', fs.createReadStream(filePath));
      formData.append('auth_key', authKey);
      formData.append('locale', 'en');
      formData.append('separation', 'inst_vocal');
      formData.append('separation_type', 'vocals_music');
      formData.append('format', 'mp3');
      formData.append('version', '1.0');
      formData.append('model', 'mdx_v2_vocft');
      formData.append('aggressiveness', 1);

      const up = await axios.post(`${xminus.api.base}${xminus.api.endpoint.upload}?catch-file`, formData, {
        headers: { ...formData.getHeaders(), ...xminus.headers }
      });

      if (up.data.status !== 'accepted') {
        return { status: false, error: "Gagal mengupload file!" };
      }

      const jobId = up.data.job_id;
      let attempts = 0;
      const maxAttempts = 60;

      while (attempts < maxAttempts) {
        const statusx = new FormData();
        statusx.append('job_id', jobId);
        statusx.append('auth_key', authKey);
        statusx.append('locale', 'en');

        const res = await axios.post(`${xminus.api.base}${xminus.api.endpoint.upload}?check-job-status`, statusx, {
          headers: { ...statusx.getHeaders(), ...xminus.headers }
        });

        if (res.data.status === 'done') {
          return {
            status: true,
            vocal: `${xminus.api.base}${xminus.api.endpoint.download}?job-id=${jobId}&stem=vocal&fmt=mp3`,
            instrumental: `${xminus.api.base}${xminus.api.endpoint.download}?job-id=${jobId}&stem=inst&fmt=mp3`
          };
        } else if (res.data.status === 'failed') {
          return { status: false, error: "Proses gagal!" };
        }

        console.log(`Proses... (${attempts + 1}/${maxAttempts})`);
        await delay(5000);
        attempts++;
      }

      return { status: false, error: "Timeout, proses terlalu lama!" };
    } catch (error) {
      return { status: false, error: "Terjadi kesalahan saat memproses file!" };
    }
  }
};

bot.onText(/\/vocalremove/, (msg) => {
  bot.sendMessage(msg.chat.id, "Silakan kirim file audio yang ingin diproses...");
});

bot.on('audio', async (msg) => {
  const chatId = msg.chat.id;
  const fileId = msg.audio.file_id;

  const file = await bot.getFile(fileId);
  const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;
  const originalFilePath = `./downloads/${file.file_unique_id}.mp3`;

  bot.sendMessage(chatId, "Mendownload file...");

  const writer = fs.createWriteStream(originalFilePath);
  const response = await axios({
    url: fileUrl,
    method: 'GET',
    responseType: 'stream'
  });

  response.data.pipe(writer);

  writer.on('finish', async () => {
    bot.sendMessage(chatId, "Proses pemisahan vokal sedang berlangsung... ⏳");

    const result = await xminus.convert(originalFilePath);

    if (result.status) {
      const vocalPath = `./downloads/${file.file_unique_id}_vocal.mp3`;
      const instrumentalPath = `./downloads/${file.file_unique_id}_instrumental.mp3`;

      bot.sendMessage(chatId, "🔄 Mendownload hasil pemisahan...");

      await downloadFile(result.vocal, vocalPath);
      await downloadFile(result.instrumental, instrumentalPath);

      bot.sendMessage(chatId, "✅ Mengirim file hasil...");

      await bot.sendAudio(chatId, vocalPath, { caption: "🎤 Vokal" });
      await bot.sendAudio(chatId, instrumentalPath, { caption: "🎶 Instrumen" });

      fs.unlinkSync(originalFilePath);
      fs.unlinkSync(vocalPath);
      fs.unlinkSync(instrumentalPath);
    } else {
      bot.sendMessage(chatId, `⚠️ Gagal memproses audio: ${result.error}`);
    }
  });

  writer.on('error', () => {
    bot.sendMessage(chatId, "❌ Gagal mendownload file!");
  });
});

const downloadFile = async (url, outputPath) => {
  const writer = fs.createWriteStream(outputPath);
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
};

bot.onText(/\/zakat(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id
    const text = match[1]

    if (!text) {
        return bot.sendMessage(
            chatId,
            `⚖️ *Kalkulator Zakat*\n\nGunakan format berikut:\n\`/zakat <jenis> <jumlah> [irigasi]\`\n\n📌 *Contoh Penggunaan:*\n➤ \`/zakat beras 900\`\n➤ \`/zakat emas 100\`\n\n*Jenis zakat yang tersedia:* \`beras, emas\`\n*Jenis irigasi:* \`berbayar, tidakberbayar (opsional, default: tidak berbayar)\``,
            { parse_mode: "Markdown" }
        )
    }

    let args = text.split(" ")
    let jenis = args[0]?.toLowerCase()
    let jumlah = parseFloat(args[1])
    let irigasi = args[2]?.toLowerCase() || "tidakberbayar"

    if (isNaN(jumlah)) {
        return bot.sendMessage(chatId, "Jumlah harus berupa angka!")
    }

    let nisab, wajib = false, zakatGram = 0, zakatRupiah = 0
    let satuan = jenis === "emas" ? "gram" : "kg"
    let hasil = `📊 *Kalkulator Zakat*\nJenis: *${jenis.toUpperCase()}*\nJumlah: *${jumlah} ${satuan}*\n`

    if (jenis === "beras") {
        nisab = 816 // Nisab beras dalam kg
        if (jumlah >= nisab) {
            wajib = true
            let persentaseZakat = irigasi === "berbayar" ? 0.05 : 0.10
            zakatGram = jumlah * persentaseZakat
        } else {
            return bot.sendMessage(chatId, `Nisab zakat pertanian adalah *${nisab} kg*, hasil panenmu belum mencapai nisab.`)
        }
    } else if (jenis === "emas") {
        nisab = 78 // Nisab emas dalam gram
        let hargaEmasPerGram = 1527023 // Harga emas per gram (bisa diubah sesuai update)
        if (jumlah >= nisab) {
            wajib = true
            zakatGram = jumlah * 0.025
            zakatRupiah = zakatGram * hargaEmasPerGram
        } else {
            return bot.sendMessage(chatId, `Nisab zakat emas adalah *${nisab} gram*, jumlah emasmu belum mencapai nisab.`)
        }
    } else {
        return bot.sendMessage(chatId, "Jenis zakat tidak didukung!\nJenis yang tersedia: `beras, emas`.")
    }

    hasil += `Nisab: *${nisab} ${satuan}*\nHasil: *${wajib ? "Wajib Zakat" : "Tidak Wajib Zakat"}*`

    if (wajib) {
        hasil += `\n🔹 Zakat yang harus dikeluarkan: *${zakatGram.toFixed(2)} ${satuan}*`
        if (jenis === "emas") {
            hasil += `\n💰 Jumlah bayar zakat: *Rp${zakatRupiah.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*`
        }
    }

    bot.sendMessage(chatId, hasil, { parse_mode: "Markdown" })
})

bot.onText(/\/rndm/, async (msg) => {
    const chatId = msg.chat.id;
    const sources = [
        "https://api.siputzx.my.id/api/r/waifu",
        "https://api.siputzx.my.id/api/r/neko"
    ];

    // Pilih salah satu API secara acak
    const randomUrl = sources[Math.floor(Math.random() * sources.length)];

    try {
      //  console.log("Mengambil gambar dari:", randomUrl);

        // Simpan gambar di folder sementara
        const imagePath = path.join(__dirname, "random_image.jpg");

        // Download gambar dalam format binary
        const response = await axios({
            url: randomUrl,
            method: "GET",
            responseType: "stream", // Ambil langsung dalam format binary
        });

        const writer = fs.createWriteStream(imagePath);
        response.data.pipe(writer);

        writer.on("finish", async () => {
            try {
                // Kirim gambar ke user
                await bot.sendPhoto(chatId, imagePath, { caption: "Here is your random image!" });

                // Hapus gambar setelah dikirim
                fs.unlink(imagePath, (err) => {
                    if (err) console.error("Gagal menghapus gambar:", err);
                });
            } catch (error) {
                console.error("Gagal mengirim gambar:", error);
                bot.sendMessage(chatId, "Terjadi kesalahan saat mengirim gambar.");
            }
        });

    } catch (error) {
        console.error("Error saat mengambil gambar:", error);
        bot.sendMessage(chatId, "Terjadi kesalahan saat mengambil gambar.");
    }
});

async function cekKhodam(name) {
  try {
    const response = await axios.get(`https://khodam.vercel.app/v2?nama=${encodeURIComponent(name)}`);
    const $ = cheerio.load(response.data);

    const khodamName = $('span.__className_cad559.text-3xl.font-bold.text-rose-600').text().trim();
    const quoteMessage = $('div.mb-5.sm\\:mb-10.px-8.text-center.text-white\\/90').text().trim().replace(/"/g, '');

    return {
      yourName: name,
      khodamName: khodamName || "Tidak ditemukan",
      quoteMessage: quoteMessage || "Tidak ada pesan",
    };
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

bot.onText(/^\/cekkhodam (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const name = match[1];

  bot.sendMessage(chatId, "Sedang Mencari khodam mu...");

  const result = await cekKhodam(name);
  if (result) {
    bot.sendMessage(
      chatId,
      `**Hasil Ramalan Saya**\n\n` +
      `**Nama:** ${result.yourName}\n` +
      `**Nama Khodam kamu:** ${result.khodamName}`,
      { parse_mode: "Markdown" }
    );
  } else {
    bot.sendMessage(chatId, "❌ Gagal mencari nama khodam.");
  }
});

const industries = [
  "Construction", "Education", "Beauty Spa", "Automotive", "Animals Pets",
  "Travel", "Sports Fitness", "Retail", "Religious", "Real Estate", "Legal",
  "Internet", "Technology", "Home Family", "Medical Dental", "Restaurant",
  "Finance", "Nonprofit", "Entertainment"
];

const stylesLogo = ["Minimalist", "3D", "Letter", "Hand-drawn", "Badge", "Stamp"];

let userData = {}; // Menyimpan data sementara

bot.onText(/\/logogenerator/, async (msg) => {
  const chatId = msg.chat.id;
  userData[chatId] = {}; // Reset data user

  await bot.sendMessage(chatId, "Masukkan Brand Name:");
  userData[chatId].step = "brandname";
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  if (!userData[chatId] || !userData[chatId].step) return;

  const text = msg.text;

  if (userData[chatId].step === "brandname") {
    userData[chatId].brandname = text;
    userData[chatId].step = "prompt";

    return bot.sendMessage(chatId, "Masukkan Prompt:");
  }

  if (userData[chatId].step === "prompt") {
    userData[chatId].prompt = text;
    userData[chatId].step = "industry";

    const sentMsg = await bot.sendMessage(chatId, "Pilih Industry:", {
      reply_markup: {
        inline_keyboard: industries.map((industry) => [
          { text: industry, callback_data: `industry_${industry}` },
        ]),
      },
    });

    userData[chatId].messageId = sentMsg.message_id; // Simpan message ID untuk diedit nanti
  }
});

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const messageId = userData[chatId]?.messageId;
  if (!userData[chatId] || !messageId) return;

  if (data.startsWith("industry_")) {
    userData[chatId].industry = data.replace("industry_", "");
    userData[chatId].step = "style";

    return bot.editMessageText("Pilih Style:", {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: {
        inline_keyboard: stylesLogo.map((style) => [
          { text: style, callback_data: `style_${style}` },
        ]),
      },
    });
  }

  if (data.startsWith("style_")) {
    userData[chatId].style = data.replace("style_", "");

    const { brandname, prompt, industry, style } = userData[chatId];

    bot.editMessageText(`Generating logo untuk *${brandname}*...\nIndustry: ${industry}\nStyle: ${style}`, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
    });

    const apiUrl = `https://fastrestapis.fasturl.cloud/aiimage/logogenerator?brandname=${encodeURIComponent(
      brandname
    )}&prompt=${encodeURIComponent(prompt)}&industry=${encodeURIComponent(
      industry
    )}&style=${encodeURIComponent(style)}`;

    try {
      const response = await axios.get(apiUrl, { responseType: "arraybuffer" });

      await bot.sendPhoto(chatId, response.data, {
        caption: `Logo untuk *${brandname}* berhasil dibuat!\nIndustry: ${industry}\nStyle: ${style}`,
        parse_mode: "Markdown",
      });

      bot.deleteMessage(chatId, messageId); // Hapus pesan generating
    } catch (error) {
      await bot.editMessageText("Gagal membuat logo. Coba lagi nanti.", {
        chat_id: chatId,
        message_id: messageId,
      });
    }

    delete userData[chatId]; // Hapus data setelah selesai
  }
});

const styleanime = [
  "Crayon",
  "Ink Stains",
  "Simple Drawing",
  "Witty",
  "Tinies",
  "Grumpy 3D",
  "90s Shoujo Manga",
  "Gothic",
  "Vector",
  "Comic Book",
  "Felted Doll",
  "Wojak",
  "Illustration",
  "Mini",
  "Clay",
  "3D",
  "Ink Painting",
  "Color Rough"
];

bot.onText(/^\/toanime(?:\s+(https?:\/\/\S+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const imageUrl = match[1];

  if (!imageUrl) {
    return bot.sendMessage(
      chatId,
      "Untuk menggunakan fitur ini, sertakan URL gambar.\n\nContoh:\n`/toanime https://gambar.jpg`",
      { parse_mode: "Markdown" }
    );
  }

  const styleButtons = styleanime.map((style) => [
    { text: style, callback_data: `toanime|${imageUrl}|${style}` },
  ]);

  bot.sendMessage(chatId, "Pilih gaya anime yang diinginkan:", {
    reply_markup: { inline_keyboard: styleButtons },
  });
});

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const [command, imageUrl, style] = query.data.split("|");

  if (command === "toanime") {
    let processingMsg = await bot.editMessageText("Sedang memproses gambar...", {
      chat_id: chatId,
      message_id: messageId,
    });

    const loadingTexts = ["Sedang memproses gambar.", "Sedang memproses gambar..", "Sedang memproses gambar..."];
    let count = 0;
    const loadingInterval = setInterval(() => {
      bot.editMessageText(loadingTexts[count % loadingTexts.length], {
        chat_id: chatId,
        message_id: messageId,
      });
      count++;
    }, 3000);

    try {
      const encodedStyle = encodeURIComponent(style);
      const apiUrl = `https://fastrestapis.fasturl.cloud/imgedit/toanimation?imageUrl=${encodeURIComponent(imageUrl)}&style=${encodedStyle}`;

      await new Promise((resolve) => setTimeout(resolve, 10000)); // Tunggu API lebih lama

      const response = await axios.get(apiUrl, { responseType: "arraybuffer" });

      if (response.headers["content-type"].includes("image")) {
        clearInterval(loadingInterval);
        bot.sendPhoto(chatId, response.data, { caption: `Hasil anime style: ${style}` });
        bot.deleteMessage(chatId, messageId);
      } else {
        throw new Error("Respon API bukan gambar.");
      }
    } catch (error) {
      clearInterval(loadingInterval);
      bot.editMessageText(`Gagal memproses gambar. Error: ${error.message}`, {
        chat_id: chatId,
        message_id: messageId,
      });
    }
  }
});

const styleskets = [
  "Anime Sketch",
  "Line Art",
  "Simplex",
  "Doodle",
  "Intricate Line",
  "Sketch",
  "Pencil Sketch",
  "Ink Sketch",
  "Manga Sketch",
  "Gouache",
  "Color Rough",
  "BG Line",
  "Ink Painting",
  "Watercolor",
  "Charcoal Sketch"
];

bot.onText(/^\/tosketsa(?:\s+(https?:\/\/\S+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const imageUrl = match[1];

  if (!imageUrl) {
    return bot.sendMessage(
      chatId,
      "Untuk menggunakan fitur ini, sertakan URL gambar.\n\nContoh:\n`/tosketsa https://gambar.jpg`",
      { parse_mode: "Markdown" }
    );
  }

  const styleButtons = styleskets.map((style) => [
    { text: style, callback_data: `tosketsa|${imageUrl}|${style}` },
  ]);

  bot.sendMessage(chatId, "Pilih gaya sketsa yang diinginkan:", {
    reply_markup: { inline_keyboard: styleButtons },
  });
});

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const [command, imageUrl, style] = query.data.split("|");

  if (command === "tosketsa") {
    let processingMsg = await bot.editMessageText("Sedang memproses gambar...", {
      chat_id: chatId,
      message_id: messageId,
    });

    const loadingTexts = ["Sedang memproses gambar.", "Sedang memproses gambar..", "Sedang memproses gambar..."];
    let count = 0;
    const loadingInterval = setInterval(() => {
      bot.editMessageText(loadingTexts[count % loadingTexts.length], {
        chat_id: chatId,
        message_id: messageId,
      });
      count++;
    }, 3000);

    try {
      const encodedStyle = encodeURIComponent(style);
      const apiUrl = `https://fastrestapis.fasturl.cloud/imgedit/tosketch?imageUrl=${encodeURIComponent(imageUrl)}&style=${encodedStyle}`;

      await new Promise((resolve) => setTimeout(resolve, 10000)); // Tambah waktu tunggu

      const response = await axios.get(apiUrl, { responseType: "arraybuffer" });

      if (response.headers["content-type"].includes("image")) {
        clearInterval(loadingInterval);
        bot.sendPhoto(chatId, response.data, { caption: `Hasil sketsa: ${style}` });
        bot.deleteMessage(chatId, messageId);
      } else {
        throw new Error("Respon API bukan gambar.");
      }
    } catch (error) {
      clearInterval(loadingInterval);
      bot.editMessageText(`Gagal memproses gambar. Error: ${error.message}`, {
        chat_id: chatId,
        message_id: messageId,
      });
    }
  }
});

bot.onText(/\/countryinfo(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const countryName = match[1] ? match[1].trim() : null;

    if (!countryName) {
        return bot.sendMessage(chatId, "Gunakan perintah:\n`/countryinfo [Nama Negara]`\nContoh: `/countryinfo Indonesia`", { 
            parse_mode: "Markdown", 
            disable_web_page_preview: true 
        });
    }

    const apiUrl = `https://api.siputzx.my.id/api/tools/countryInfo?name=${encodeURIComponent(countryName)}`;

    try {
        const response = await axios.get(apiUrl);
        const data = response.data;

        if (!data.status || !data.data) {
            return bot.sendMessage(chatId, `❌ Data negara *${countryName}* tidak ditemukan!`, { 
                parse_mode: "Markdown", 
                disable_web_page_preview: true 
            });
        }

        const country = data.data;
        const flagUrl = country.flag || '';

        const caption = `🌍 *Informasi Negara ${country.name}* 🌍\n\n` +
            `📍 *Ibukota:* ${country.capital}\n` +
            `📞 *Kode Telepon:* ${country.phoneCode}\n` +
            `🗺 *Peta:* [Google Maps](${country.googleMapsLink})\n` +
            `🌍 *Benua:* ${country.continent.name} ${country.continent.emoji}\n` +
            `📏 *Luas:* ${country.area.squareKilometers.toLocaleString()} km²\n` +
            `🔗 *Domain Internet:* ${country.internetTLD}\n` +
            `🚦 *Sisi Mengemudi:* ${country.drivingSide}\n` +
            `🍺 *Larangan Alkohol:* ${country.alcoholProhibition}\n` +
            `💰 *Mata Uang:* ${country.currency}\n` +
            `🏛 *Pemerintahan:* ${country.constitutionalForm}\n` +
            `🌎 *Negara Tetangga:* ${country.neighbors.map(n => n.name).join(", ") || "Tidak ada"}\n` +
            `🔥 *Terkenal Karena:* ${country.famousFor}\n` +
            `🔢 *Kode ISO:* ${country.isoCode.alpha3} (${country.isoCode.alpha2})\n`;

        if (flagUrl) {
            bot.sendPhoto(chatId, flagUrl, { 
                caption, 
                parse_mode: "Markdown", 
                disable_web_page_preview: true 
            });
        } else {
            bot.sendMessage(chatId, caption, { 
                parse_mode: "Markdown", 
                disable_web_page_preview: true 
            });
        }

    } catch (error) {
        bot.sendMessage(chatId, "❌ Terjadi kesalahan saat mengambil data negara!", { 
            disable_web_page_preview: true 
        });
    }
});

bot.onText(/^\/ttp(?:\s(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const inputText = match[1];

    if (!inputText) {
        return bot.sendMessage(chatId, "Cara penggunaan: `/ttp teks`\n\nContoh: `/ttp hai`", { parse_mode: "Markdown" });
    }

    const apiUrl = `https://www.velyn.biz.id/api/maker/ttp?text=${encodeURIComponent(inputText)}`;

    try {
        const response = await axios.get(apiUrl);
        if (response.data.status && response.data.data.length > 0) {
            const imageUrl = response.data.data[0].url;
            bot.sendPhoto(chatId, imageUrl, { caption: `TTP untuk: *${inputText}*`, parse_mode: "Markdown" });
        } else {
            bot.sendMessage(chatId, "Gagal membuat TTP. Silakan coba lagi.");
        }
    } catch (error) {
        bot.sendMessage(chatId, "Terjadi kesalahan saat mengambil gambar. Coba lagi nanti.");
        console.error(error);
    }
});

const SALDO_FILE = 'saldo.json';

// Fungsi untuk membaca file saldo.json
function readSaldo() {
    if (!fs.existsSync(SALDO_FILE)) fs.writeFileSync(SALDO_FILE, '{}');
    return JSON.parse(fs.readFileSync(SALDO_FILE, 'utf8'));
}

// Fungsi untuk menyimpan saldo
function saveSaldo(saldo) {
    fs.writeFileSync(SALDO_FILE, JSON.stringify(saldo, null, 2));
}

// Fungsi untuk menangani perintah /addsaldo
function handleAddSaldo(msg, bot) {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const args = msg.text.split(" ").slice(1).join(" ");

    // Cek apakah user adalah admin
    if (!ADMIN_IDS.includes(userId)) {
        return bot.sendMessage(chatId, "❌ Anda tidak memiliki izin untuk menggunakan perintah ini.");
    }

    let saldo = readSaldo();
    let userList = Object.keys(saldo);
    let response = "";

    // Jika tidak ada argumen, tampilkan cara penggunaan
    if (!args) {
        return bot.sendMessage(chatId, `📌 *Cara Penggunaan*:\n
1. *Melihat daftar saldo pengguna*:
   \`/addsaldo list\`

2. *Menambah saldo pengguna*:
   \`/addsaldo tambah|nomor user|jumlah\`
   Contoh: \`/addsaldo tambah|1|50000\`

3. *Mengurangi saldo pengguna*:
   \`/addsaldo kurangi|nomor user|jumlah/all\`
   Contoh: 
   - \`/addsaldo kurangi|1|30000\` (mengurangi 30.000)
   - \`/addsaldo kurangi|1|all\` (menghapus semua saldo user)
`, { parse_mode: "Markdown" });
    }

    if (args === "list") {
        if (userList.length === 0) {
            return bot.sendMessage(chatId, "📂 Tidak ada data saldo yang tersimpan.");
        }

        userList.forEach((id, index) => {
            response += `${index + 1}. (${id}) | ${saldo[id].toLocaleString()}\n`;
        });

        return bot.sendMessage(chatId, `📜 *Daftar Saldo:*\n\n${response}`, { parse_mode: "Markdown" });
    }

    const commandParts = args.split("|");
    if (commandParts.length < 3) {
        return bot.sendMessage(chatId, "⚠️ Format perintah salah!\nGunakan: `/addsaldo list` atau `/addsaldo (tambah/kurangi)|nomor user|jumlah/all`", { parse_mode: "Markdown" });
    }

    const action = commandParts[0]; // tambah atau kurangi
    const userIndex = parseInt(commandParts[1]) - 1;
    const amount = commandParts[2];

    if (userIndex < 0 || userIndex >= userList.length) {
        return bot.sendMessage(chatId, "⚠️ Nomor pengguna tidak ditemukan dalam daftar saldo.");
    }

    const targetUser = userList[userIndex];
    let targetSaldo = saldo[targetUser];

    if (action === "tambah") {
        const jumlahTambah = parseInt(amount);
        if (isNaN(jumlahTambah) || jumlahTambah <= 0) {
            return bot.sendMessage(chatId, "⚠️ Jumlah saldo yang ditambahkan harus berupa angka positif.");
        }
        saldo[targetUser] += jumlahTambah;
        saveSaldo(saldo);
        return bot.sendMessage(chatId, `✅ Saldo pengguna ${targetUser} telah ditambah ${jumlahTambah.toLocaleString()}. Saldo sekarang: ${saldo[targetUser].toLocaleString()}`);
    }

    if (action === "kurangi") {
        if (amount === "all") {
            saldo[targetUser] = 0;
        } else {
            const jumlahKurang = parseInt(amount);
            if (isNaN(jumlahKurang) || jumlahKurang <= 0) {
                return bot.sendMessage(chatId, "⚠️ Jumlah saldo yang dikurangi harus berupa angka positif.");
            }
            if (jumlahKurang > targetSaldo) {
                return bot.sendMessage(chatId, `⚠️ Saldo tidak mencukupi! Saldo pengguna saat ini hanya ${targetSaldo.toLocaleString()}`);
            }
            saldo[targetUser] -= jumlahKurang;
        }
        saveSaldo(saldo);
        return bot.sendMessage(chatId, `✅ Saldo pengguna ${targetUser} telah dikurangi. Saldo sekarang: ${saldo[targetUser].toLocaleString()}`);
    }

    return bot.sendMessage(chatId, "⚠️ Perintah tidak dikenali.");
}

// Tambahkan ke event message bot
bot.onText(/\/addsaldo(.*)/, (msg) => handleAddSaldo(msg, bot));

// Perintah /siapakahaku
bot.onText(/\/siapakahaku/, async (msg) => {
    const chatId = msg.chat.id;

    try {
        // Ambil soal dari API
        const response = await axios.get("https://api.siputzx.my.id/api/games/siapakahaku");
        if (response.data.status && response.data.data) {
            const soal = response.data.data.soal;
            const jawaban = response.data.data.jawaban.toLowerCase(); // Normalisasi jawaban

            // Simpan soal dan set timeout 1 menit
            tebakSiapaAku[chatId] = { jawaban, timeout: null };

            bot.sendMessage(chatId, `Tebak siapa aku:\n\n*${soal}*\n\n(Ketik jawaban atau ketik "menyerah" untuk melihat jawabannya.)`, { parse_mode: "Markdown" });

            // Set timer 1 menit untuk menghapus sesi
            tebakSiapaAku[chatId].timeout = setTimeout(() => {
                bot.sendMessage(chatId, `⏳ Waktu habis! Jawabannya adalah *${jawaban}*`, { parse_mode: "Markdown" });
                delete tebakSiapaAku[chatId];
            }, 60000);
        } else {
            bot.sendMessage(chatId, "Gagal mendapatkan soal, coba lagi nanti.");
        }
    } catch (error) {
        bot.sendMessage(chatId, "Terjadi kesalahan saat mengambil soal.");
        console.error(error);
    }
});

// Menangkap jawaban user
bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text ? msg.text.toLowerCase() : "";

    if (tebakSiapaAku[chatId]) {
        if (text === tebakSiapaAku[chatId].jawaban) {
            bot.sendMessage(chatId, `✅ Benar! Jawabannya adalah *${tebakSiapaAku[chatId].jawaban}*`, { parse_mode: "Markdown" });
            clearTimeout(tebakSiapaAku[chatId].timeout);
            delete tebakSiapaAku[chatId];
        } else if (text === "menyerah") {
            bot.sendMessage(chatId, `😢 Kamu menyerah. Jawabannya adalah *${tebakSiapaAku[chatId].jawaban}*`, { parse_mode: "Markdown" });
            clearTimeout(tebakSiapaAku[chatId].timeout);
            delete tebakSiapaAku[chatId];
        } else {
            bot.sendMessage(chatId, "❌ Salah! Coba lagi.");
        }
    }
});

bot.onText(/\/pinchat/, async (msg) => {
    const chatId = msg.chat.id;
    const replyToMessage = msg.reply_to_message;

    if (!replyToMessage) {
        return bot.sendMessage(chatId, "Balas pesan yang ingin disematkan lalu gunakan /pinchat.");
    }

    const messageId = replyToMessage.message_id;

    try {
        await bot.pinChatMessage(chatId, messageId);
        bot.sendMessage(chatId, "Pesan berhasil disematkan.");
    } catch (error) {
        bot.sendMessage(chatId, "Gagal menyematkan pesan. Pastikan bot memiliki izin menyematkan pesan.");
    }
});

// Fungsi untuk membaca log dari file JSON
function readLog() {
    if (!fs.existsSync(LOG_FILE)) return {};
    return JSON.parse(fs.readFileSync(LOG_FILE, "utf8"));
}

// Fungsi untuk menyimpan log ke file JSON
function saveLog(logData) {
    fs.writeFileSync(LOG_FILE, JSON.stringify(logData, null, 2));
}

// Menyimpan perintah yang diketik user
bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.username || `User_${msg.from.id}`;
    const command = msg.text;
    const today = new Date().toLocaleDateString("id-ID");

    if (!command || typeof command !== "string" || !command.startsWith("/")) return; // Hanya menyimpan perintah

    let logData = readLog();
    if (!logData[chatId]) logData[chatId] = [];
    
    logData[chatId].push(`[${today} | ${command}]`);
    saveLog(logData);
});

// Saat user menggunakan perintah /logme
bot.onText(/\/logme/, async (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.username || `User_${msg.from.id}`;
    const today = new Date().toLocaleDateString("id-ID").replace(/\//g, "_");
    
    let logData = readLog();
    if (!logData[chatId] || logData[chatId].length === 0) {
        return bot.sendMessage(chatId, "Log kamu masih kosong.");
    }

    // Gabungkan log menjadi teks
    const logText = logData[chatId].map((entry, index) => `${index + 1}. ${entry}`).join("\n");

    // Buat URL API
    const apiUrl = `https://fastrestapis.fasturl.cloud/tool/texttonote?name=Name: ${username}&classroom=Class: XXX-XXX&subject=Title: my-log&date=Date: ${today}&content=${encodeURIComponent(logText)}&font=HandwritingCR-2.ttf&format=jpg`;

    try {
        // Dapatkan gambar dari API
        const response = await axios.get(apiUrl, { responseType: "arraybuffer" });

        // Simpan gambar sementara
        const imagePath = `log_${chatId}.jpg`;
        fs.writeFileSync(imagePath, response.data);

        // Kirim gambar ke user
        await bot.sendPhoto(chatId, imagePath, { caption: `Log perintah kamu, @${username}` });

        // Hapus file gambar setelah dikirim
        fs.unlinkSync(imagePath);
    } catch (error) {
        console.error("Gagal mengambil gambar log:", error);
        bot.sendMessage(chatId, "Terjadi kesalahan saat mengambil log.");
    }
});

// Load daftar command dari menu.json
let menuCommands = [];
try {
    menuCommands = JSON.parse(fs.readFileSync("menu.json", "utf-8"));
} catch (err) {
    console.error("Gagal membaca menu.json:", err);
}

// Fungsi untuk menghitung tingkat kemiripan dua string
function similarity(s1, s2) {
    if (!s1 || !s2) return 0;
    let longer = s1.length > s2.length ? s1 : s2;
    let shorter = s1.length > s2.length ? s2 : s1;
    
    let editDistance = (str1, str2) => {
        const costs = Array(str2.length + 1).fill().map((_, i) => i);
        for (let i = 1; i <= str1.length; i++) {
            let lastValue = i;
            for (let j = 1; j <= str2.length; j++) {
                let newValue = str1[i - 1] === str2[j - 1] ? costs[j - 1] : Math.min(costs[j - 1] + 1, lastValue + 1, costs[j] + 1);
                costs[j - 1] = lastValue;
                lastValue = newValue;
            }
            costs[str2.length] = lastValue;
        }
        return costs[str2.length];
    };
    
    let score = 1 - (editDistance(longer, shorter) / longer.length);
    return score;
}

// Fitur koreksi otomatis
let autoCorrectionEnabled = true;

// Command untuk mengaktifkan/nonaktifkan koreksi
bot.onText(/\/autokoreksi (on|off)/, (msg, match) => {
    if (!ADMIN_IDS.includes(msg.from.id)) {
        return bot.sendMessage(msg.chat.id, "❌ Anda tidak memiliki izin untuk mengubah pengaturan ini.");
    }

    autoCorrectionEnabled = match[1] === "on";
    bot.sendMessage(msg.chat.id, `✅ Auto-koreksi ${autoCorrectionEnabled ? "diaktifkan" : "dinonaktifkan"}.`);
});

// Menangani semua pesan untuk mendeteksi typo pada command
bot.on("message", (msg) => {
    if (!msg.text || !msg.text.startsWith("/")) return;
    if (!autoCorrectionEnabled) return;

    let command = msg.text.split(" ")[0].slice(1); // Ambil hanya bagian command tanpa "/"
    
    if (menuCommands.includes(command)) return; // Jika command valid, abaikan

    let bestMatch = null;
    let bestScore = 0.6; // Ambang batas minimal kemiripan

    for (let cmd of menuCommands) {
        let score = similarity(command, cmd);
        if (score > bestScore) {
            bestScore = score;
            bestMatch = cmd;
        }
    }

    if (bestMatch) {
        bot.sendMessage(msg.chat.id, `🔍 Apakah yang Anda maksud "/${bestMatch}"?`);
    }
});

// Fitur /ai (manual)
bot.onText(/^\/ai2 (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    let userInput = match[1];

    await processAiRequest(chatId, userInput, msg.from.id);
});

// Fitur /autoai2 (on/off)
bot.onText(/^\/autoai2 (on|off)/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const mode = match[1];

    if (mode === "on") {
        autoAiMode.add(userId);
        bot.sendMessage(chatId, "Auto AI diaktifkan! Semua pesanmu akan dikirim ke AI.");
    } else {
        autoAiMode.delete(userId);
        bot.sendMessage(chatId, "Auto AI dimatikan! Pesanmu tidak akan dikirim ke AI.");
    }
});

// Mode Auto AI (semua pesan user akan masuk ke AI jika aktif)
bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    // Abaikan jika bukan teks atau jika itu perintah
    if (!text || text.startsWith("/")) return;

    // Jika Auto AI aktif, kirim semua pesan ke AI
    if (autoAiMode.has(userId)) {
        await processAiRequest(chatId, text, userId);
    }
});

// Fungsi untuk memproses permintaan AI
async function processAiRequest(chatId, userInput, userId) {
    // Regex untuk menangkap URL dalam tanda ""
    const imageRegex = /"(https?:\/\/[^"]+)"/;
    const imageMatch = userInput.match(imageRegex);

    let textQuery = userInput.replace(imageRegex, "").trim(); // Ambil teks tanpa URL
    let imageUrl = imageMatch ? imageMatch[1] : null;

    // Style kombinasi Onee-san + Cool Tsundere
    let apiUrl = `https://fastrestapis.fasturl.cloud/aillm/gpt-4o?ask=${encodeURIComponent(textQuery)}&style=answer%20like%20a%20realistic%20big%20sister,%20who%20is%20caring,%20expressive,%20and%20has%20dynamic%20emotions%20depending%20on%20the%20situation,%20use%20Indonesian&sessionId=${userId}`;
    if (imageUrl) apiUrl += `&imageUrl=${encodeURIComponent(imageUrl)}`;

    try {
        const response = await axios.get(apiUrl);
        let result = response.data.result || "Gagal mendapatkan respon dari AI.";

        // Batas karakter Telegram per pesan
        const maxLength = 4000;

        // Jika result lebih panjang dari maxLength, bagi jadi beberapa bagian
        if (result.length > maxLength) {
            let parts = [];
            for (let i = 0; i < result.length; i += maxLength) {
                parts.push(result.substring(i, i + maxLength));
            }

            // Kirimkan setiap bagian satu per satu
            for (const part of parts) {
                await bot.sendMessage(chatId, part);
            }
        } else {
            bot.sendMessage(chatId, result);
        }
    } catch (error) {
        bot.sendMessage(chatId, "Terjadi kesalahan saat mengambil data AI.");
    }
}

bot.onText(/\/webrec/, async (msg) => {
    const chatId = msg.chat.id;

    // Langkah 1: Minta URL
    bot.sendMessage(chatId, "Silakan masukkan URL website yang ingin direkam:").then(() => {
        bot.once("message", async (msg) => {
            if (!msg.text || msg.text.startsWith("/")) return;
            const url = msg.text.trim();

            // Langkah 2: Pilih device (mobile/desktop)
            bot.sendMessage(chatId, "Pilih device: ketik *mobile* atau *desktop*", { parse_mode: "Markdown" }).then(() => {
                bot.once("message", async (msg) => {
                    const device = msg.text.toLowerCase();
                    if (device !== "mobile" && device !== "desktop") {
                        return bot.sendMessage(chatId, "Pilihan tidak valid. Gunakan *mobile* atau *desktop*.", { parse_mode: "Markdown" });
                    }

                    // Langkah 3: Pilih durasi (maks 30 detik)
                    bot.sendMessage(chatId, "Masukkan durasi rekaman dalam detik (maks 30):").then(() => {
                        bot.once("message", async (msg) => {
                            let time = parseInt(msg.text);
                            if (isNaN(time) || time < 1 || time > 30) {
                                return bot.sendMessage(chatId, "Durasi tidak valid. Masukkan angka antara 1-30.");
                            }

                            // Langkah 4: Pilih FPS (maks 120)
                            bot.sendMessage(chatId, "Masukkan FPS (maks 120):").then(() => {
                                bot.once("message", async (msg) => {
                                    let fps = parseInt(msg.text);
                                    if (isNaN(fps) || fps < 1 || fps > 120) {
                                        return bot.sendMessage(chatId, "FPS tidak valid. Masukkan angka antara 1-120.");
                                    }

                                    // Panggil API untuk merekam website
                                    const apiUrl = `https://fastrestapis.fasturl.cloud/tool/screenrecord?url=${encodeURIComponent(url)}&device=${device}&delay=0&time=${time}&fps=${fps}`;
                                    bot.sendMessage(chatId, "🔄 Sedang merekam... Mohon tunggu beberapa saat.");

                                    try {
                                        const response = await axios.get(apiUrl, { responseType: "stream" });

                                        if (response.status === 200) {
                                            bot.sendVideo(chatId, response.data, { caption: `🎥 Rekaman website: ${url}\n📱 Device: ${device}\n⏳ Durasi: ${time} detik\n🎞️ FPS: ${fps}` });
                                        } else {
                                            bot.sendMessage(chatId, "Gagal merekam website. Coba lagi nanti.");
                                        }
                                    } catch (error) {
                                        console.error("Error recording website:", error);
                                        bot.sendMessage(chatId, "Terjadi kesalahan saat merekam website.");
                                    }
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

bot.onText(/^\/ssweb(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const url = match[1];

    if (!url) {
        return bot.sendMessage(chatId, "❌ Masukkan URL setelah perintah. Contoh:\n`/ssweb google.com`", { parse_mode: "Markdown" });
    }

    const apiUrl = `https://api.siputzx.my.id/api/tools/ssweb?url=${encodeURIComponent(url)}&theme=light&device=desktop`;
    const filePath = path.join(__dirname, `screenshot_${chatId}.jpg`);

    bot.sendMessage(chatId, "⏳ Sedang mengambil screenshot...");

    try {
        // Unduh gambar dari API
        const response = await axios({
            url: apiUrl,
            responseType: "stream",
        });

        // Simpan ke file sementara
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        writer.on("finish", async () => {
            // Kirim gambar ke Telegram
            await bot.sendPhoto(chatId, filePath, { caption: `🖥 Screenshot dari: ${url}` });

            // Hapus file setelah dikirim
            fs.unlinkSync(filePath);
        });
    } catch (error) {
        bot.sendMessage(chatId, "❌ Gagal mengambil screenshot. Pastikan URL valid dan coba lagi.");
    }
});

bot.onText(/\/susunkata/, async (msg) => {
    const chatId = msg.chat.id;

    try {
        const response = await axios.get("https://api.siputzx.my.id/api/games/susunkata");
        const { soal, tipe, jawaban } = response.data.data;

        susunKataSessions[chatId] = {
            answer: jawaban.toLowerCase(),
            timer: setTimeout(() => {
                bot.sendMessage(chatId, `⏳ Waktu habis! Jawaban yang benar adalah: *${jawaban}*`, { parse_mode: "Markdown" });
                delete susunKataSessions[chatId];
            }, 60000), // 1 menit
        };

        bot.sendMessage(chatId, `🧩 Susun kata ini!\n\n🔠 *Soal:* ${soal}\n📌 *Tipe:* ${tipe}\n\nKetik *menyerah* jika ingin menyerah.`, { parse_mode: "Markdown" });

    } catch (error) {
        bot.sendMessage(chatId, "⚠️ Terjadi kesalahan, coba lagi nanti.");
        console.error(error);
    }
});

bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text?.toLowerCase();

    if (susunKataSessions[chatId] && text) {
        if (text === "menyerah") {
            clearTimeout(susunKataSessions[chatId].timer);
            bot.sendMessage(chatId, `😔 Kamu menyerah! Jawaban yang benar adalah *${susunKataSessions[chatId].answer}*`, { parse_mode: "Markdown" });
            delete susunKataSessions[chatId];
        } else if (text === susunKataSessions[chatId].answer) {
            clearTimeout(susunKataSessions[chatId].timer);
            bot.sendMessage(chatId, `✅ Benar! Jawabannya adalah *${susunKataSessions[chatId].answer}*!`, { parse_mode: "Markdown" });
            delete susunKataSessions[chatId];
        } else {
            bot.sendMessage(chatId, "❌ Salah! Coba lagi atau ketik *menyerah*.");
        }
    }
});

bot.onText(/\/tebakgambar/, async (msg) => {
    const chatId = msg.chat.id;

    try {
        const response = await axios.get("https://api.siputzx.my.id/api/games/tebakgambar");
        const { img, jawaban, deskripsi } = response.data.data;

        // Download gambar sebagai buffer
        const imageBuffer = await axios.get(img, { responseType: "arraybuffer" });

        tebakGambarSessions[chatId] = {
            answer: jawaban.toLowerCase(),
            timer: setTimeout(() => {
                bot.sendMessage(chatId, `⏳ Waktu habis! Jawaban yang benar adalah: *${jawaban}*`, { parse_mode: "Markdown" });
                delete tebakGambarSessions[chatId];
            }, 60000), // 1 menit
        };

        bot.sendPhoto(chatId, imageBuffer.data, {
            caption: `🧐 Tebak gambar ini!\n\n🔍 *Petunjuk:* ${deskripsi}\n\nKetik *menyerah* jika ingin menyerah.`,
            parse_mode: "Markdown",
        });

    } catch (error) {
        bot.sendMessage(chatId, "⚠️ Terjadi kesalahan, coba lagi nanti.");
        console.error(error);
    }
});

bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text?.toLowerCase();

    if (tebakGambarSessions[chatId] && text) {
        if (text === "menyerah") {
            clearTimeout(tebakGambarSessions[chatId].timer);
            bot.sendMessage(chatId, `😔 Kamu menyerah! Jawaban yang benar adalah *${tebakGambarSessions[chatId].answer}*`, { parse_mode: "Markdown" });
            delete tebakGambarSessions[chatId];
        } else if (text === tebakGambarSessions[chatId].answer) {
            clearTimeout(tebakGambarSessions[chatId].timer);
            bot.sendMessage(chatId, `✅ Benar! Jawabannya adalah *${tebakGambarSessions[chatId].answer}*!`, { parse_mode: "Markdown" });
            delete tebakGambarSessions[chatId];
        } else {
            bot.sendMessage(chatId, "❌ Salah! Coba lagi.");
        }
    }
});

bot.onText(/\/tebakbendera/, async (msg) => {
    const chatId = msg.chat.id;

    try {
        const response = await axios.get("https://api.siputzx.my.id/api/games/tebakbendera");
        const { name, img } = response.data;

        // Download gambar sebagai buffer
        const imageBuffer = await axios.get(img, { responseType: "arraybuffer" });

        tebakBenderaSessions[chatId] = {
            answer: name.toLowerCase(),
            timer: setTimeout(() => {
                bot.sendMessage(chatId, `⏳ Waktu habis! Jawaban yang benar adalah: *${name}*`, { parse_mode: "Markdown" });
                delete tebakBenderaSessions[chatId];
            }, 60000), // 1 menit
        };

        bot.sendPhoto(chatId, imageBuffer.data, {
            caption: "🧐 Tebak bendera ini! Kamu punya waktu 1 menit.\n\nKetik *menyerah* jika ingin menyerah.",
            parse_mode: "Markdown",
        });

    } catch (error) {
        bot.sendMessage(chatId, "⚠️ Terjadi kesalahan, coba lagi nanti.");
        console.error(error);
    }
});

bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text?.toLowerCase();

    if (tebakBenderaSessions[chatId] && text) {
        if (text === "menyerah") {
            clearTimeout(tebakBenderaSessions[chatId].timer);
            bot.sendMessage(chatId, `😔 Kamu menyerah! Jawaban yang benar adalah *${tebakBenderaSessions[chatId].answer}*`, { parse_mode: "Markdown" });
            delete tebakBenderaSessions[chatId];
        } else if (text === tebakBenderaSessions[chatId].answer) {
            clearTimeout(tebakBenderaSessions[chatId].timer);
            bot.sendMessage(chatId, `✅ Benar! Ini adalah bendera *${tebakBenderaSessions[chatId].answer}*!`, { parse_mode: "Markdown" });
            delete tebakBenderaSessions[chatId];
        } else {
            bot.sendMessage(chatId, "❌ Salah! Coba lagi.");
        }
    }
});

bot.onText(/^\/emojimix (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const input = match[1].split("|");

    if (input.length !== 2) {
        return bot.sendMessage(chatId, "Format salah! Gunakan: /emojimix (emoji)|(emoji)");
    }

    const emoji1 = encodeURIComponent(input[0].trim());
    const emoji2 = encodeURIComponent(input[1].trim());
    const url = `https://fastrestapis.fasturl.cloud/maker/emojimix?emoji1=${emoji1}&emoji2=${emoji2}`;

    try {
        // Ambil gambar dari API
        const response = await axios.get(url, { responseType: "arraybuffer" });
        const filePath = path.join(__dirname, "emojimix.png");

        // Simpan gambar sementara
        fs.writeFileSync(filePath, response.data);

        // Kirim sebagai stiker
        await bot.sendSticker(chatId, filePath);

        // Hapus file setelah dikirim
        fs.unlinkSync(filePath);
    } catch (error) {
        console.error("Gagal mengambil emoji mix:", error);
        bot.sendMessage(chatId, "Gagal membuat emoji mix. Coba lagi.");
    }
});

bot.onText(/^\/apakah(?:\s+(.+))?$/, (msg, match) => {
    const chatId = msg.chat.id;
    const pertanyaan = match[1];

    if (!pertanyaan) {
        return bot.sendMessage(
            chatId,
            "❌ `/apakah`\n✅ `/apakah <pertanyaan>`\n\nContoh: `/apakah aku ganteng?`",
            { parse_mode: "Markdown" }
        );
    }

    const jawabanList = [
        "Ya", "Tidak", "Tidak tahu", "Mungkin", "Mungkin tidak",
        "Tentu saja", "Tentu tidak", "Bisa jadi", "Kemungkinan besar", "Kemungkinan kecil"
    ];

    const jawaban = jawabanList[Math.floor(Math.random() * jawabanList.length)];

    bot.sendMessage(chatId, `*Pertanyaan:* ${pertanyaan}\n*Jawaban:* ${jawaban}`, { parse_mode: "Markdown" });
});

bot.onText(/\/sleep/, async (msg) => {
    const chatId = msg.chat.id;
    let countdown = 5; // Waktu mundur 5 detik

    // Kirim pesan awal dengan tombol
    const sentMessage = await bot.sendMessage(
        chatId,
        `Apakah Anda yakin ingin mematikan bot?`,
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Matikan Bot", callback_data: "shutdown" }],
                    [{ text: `${countdown}`, callback_data: "timer" }], // Tombol timer (tidak bisa ditekan)
                    [{ text: "Batal", callback_data: "cancel" }]
                ]
            }
        }
    );

    const messageId = sentMessage.message_id;

    // Timer untuk update tombol timer setiap detik
    const interval = setInterval(() => {
        countdown--;

        if (countdown === 0) {
            clearInterval(interval);
            bot.editMessageText("Perintah dibatalkan (waktu habis).", {
                chat_id: chatId,
                message_id: messageId
            });
        } else {
            bot.editMessageReplyMarkup(
                {
                    inline_keyboard: [
                        [{ text: "Matikan Bot", callback_data: "shutdown" }],
                        [{ text: `${countdown}`, callback_data: "timer" }],
                        [{ text: "Batal", callback_data: "cancel" }]
                    ]
                },
                { chat_id: chatId, message_id: messageId }
            );
        }
    }, 1000);

    // Event untuk menangani tombol
    bot.once("callback_query", (callbackQuery) => {
        clearInterval(interval); // Hentikan timer jika user merespons
        const data = callbackQuery.data;

        if (data === "shutdown") {
            bot.editMessageText("Bot dimatikan...", {
                chat_id: chatId,
                message_id: messageId
            });

            setTimeout(() => {
                bot.sendMessage(chatId, "Bot telah dimatikan.");
                process.exit(0); // Mematikan bot
            }, 1000);
        } else if (data === "cancel") {
            bot.editMessageText("Perintah dibatalkan.", {
                chat_id: chatId,
                message_id: messageId
            });
        }
    });
});

bot.onText(/\/jadwalsholat(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const namaKota = match[1];

    if (!namaKota) {
        return bot.sendMessage(chatId, "❌ /jadwalsholat\n✅ /jadwalsholat <nama kota>\ncontoh: /jadwalsholat jakarta");
    }

    const url = `https://velyn.vercel.app/api/search/jadwalSholat?query=${encodeURIComponent(namaKota)}`;

    try {
        const response = await axios.get(url);
        const data = response.data.data;

        if (!data) {
            return bot.sendMessage(chatId, `Maaf, jadwal sholat untuk kota "${namaKota}" tidak ditemukan.`);
        }

        const hasil = `
🕌 *Jadwal Sholat ${namaKota}* 🕌
- *Imsak*: ${data.imsak}
- *Subuh*: ${data.subuh}
- *Dzuhur*: ${data.dzuhur}
- *Ashar*: ${data.ashar}
- *Maghrib*: ${data.maghrib}
- *Isya*: ${data.isya}

📅 *Tanggal*: ${new Date().toLocaleDateString('id-ID')}
        `;

        bot.sendMessage(chatId, hasil, { parse_mode: "Markdown" });

    } catch (error) {
        bot.sendMessage(chatId, "Terjadi kesalahan saat mengambil data. Silakan coba lagi nanti.");
    }
});

const dadu = ["⚀ (1)", "⚁ (2)", "⚂ (3)", "⚃ (4)", "⚄ (5)", "⚅ (6)"];

bot.onText(/\/dadu/, async (msg) => {
    const chatId = msg.chat.id;
    
    // Kirim pesan awal
    let message = await bot.sendMessage(chatId, "🎲 Mengocok dadu...");
    
    let previousDice = "";
    let i = 0;
    let interval = setInterval(() => {
        let randomDice;
        
        // Pastikan angka yang keluar tidak sama dengan sebelumnya
        do {
            randomDice = dadu[Math.floor(Math.random() * dadu.length)];
        } while (randomDice === previousDice);
        
        previousDice = randomDice;

        bot.editMessageText(`🎲 Mengocok dadu...\n\n${randomDice}`, { 
            chat_id: chatId, 
            message_id: message.message_id 
        });

        i++;
        if (i > 5) { // Setelah 5 kali perubahan, stop animasi
            clearInterval(interval);
            let finalDice;
            
            // Pastikan hasil akhir berbeda dari angka terakhir dalam animasi
            do {
                finalDice = dadu[Math.floor(Math.random() * dadu.length)];
            } while (finalDice === previousDice);
            
            bot.editMessageText(`🎲 Hasil dadu: ${finalDice}`, { 
                chat_id: chatId, 
                message_id: message.message_id 
            });
        }
    }, 500); // Ubah angka setiap 0.5 detik
});

bot.onText(/\/imgdescription/, (msg) => {
  const chatId = msg.chat.id;
  pendingRequests[chatId] = true;
  bot.sendMessage(chatId, "Silakan kirimkan gambar yang ingin dideskripsikan.");
});

bot.on("photo", async (msg) => {
  const chatId = msg.chat.id;

  if (!pendingRequests[chatId]) return;

  delete pendingRequests[chatId];

  const fileId = msg.photo[msg.photo.length - 1].file_id;

  try {
    const fileLink = await bot.getFileLink(fileId);
    const filePath = "/data/data/com.termux/files/home/temp_image.jpg";

    const writer = fs.createWriteStream(filePath);
    const response = await axios({ url: fileLink, method: "GET", responseType: "stream" });

    response.data.pipe(writer);
    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    const form = new FormData();
    form.append("image", fs.createReadStream(filePath));

    const apiResponse = await axios.post(
      "https://fastrestapis.fasturl.cloud/aiimage/imgdescription-v2",
      form,
      { headers: form.getHeaders() }
    );

    fs.unlinkSync(filePath);

    if (apiResponse.data.result?.description) {
      const originalText = apiResponse.data.result.description;

      // Terjemahkan ke Bahasa Indonesia
      const translatedText = await translate(originalText, { to: "id" });

      bot.sendMessage(chatId, `🖼 Deskripsi Gambar:\n\n${translatedText.text}`);
    } else {
      bot.sendMessage(chatId, "❌ Gagal mendapatkan deskripsi gambar.");
    }
  } catch (error) {
    console.error("Error:", error);
    bot.sendMessage(chatId, "❌ Terjadi kesalahan saat memproses gambar.");
  }
});

bot.onText(/^\/cekip$/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Silakan kirim alamat IP yang ingin diperiksa.");

    bot.once("message", async (msg) => {
        const ip = msg.text.trim();
        if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
            return bot.sendMessage(chatId, "⚠️ Format IP tidak valid. Harap kirim alamat IP yang benar.");
        }

        try {
            const res = await fetch(`https://fastrestapis.fasturl.cloud/tool/whoip?ip=${ip}`);
            const json = await res.json();

            if (json.status !== 200) {
                return bot.sendMessage(chatId, "❌ Gagal mendapatkan informasi IP. Coba lagi nanti.");
            }

            const data = json.result;
            const info = `🌍 *Informasi IP*\n\n` +
                `📌 *IP*: ${data.ip}\n` +
                `🔍 *Tipe IP*: ${data.ipType}\n` +
                `🖧 *Network*: ${data.network}\n` +
                `🏢 *ISP*: ${data.isp}\n` +
                `🏛 *Organisasi*: ${data.org}\n` +
                `🆔 *ASN*: ${data.asn} (${data.asnData.asnName})\n` +
                `🗺️ *Negara*: ${data.geoDetails.country} (${data.geoDetails.countryCode})\n` +
                `📍 *Kota*: ${data.locationInsights.city}, ${data.locationInsights.region}\n` +
                `⏳ *Zona Waktu*: ${data.locationInsights.timezone} (GMT ${data.locationInsights.timezoneGmt})\n` +
                `🌐 *Google Maps*: [Klik di sini](${data.googleMapLink})\n` +
                `🛡️ *Ancaman*: ${data.threatData.threatLevel}`;

            bot.sendMessage(chatId, info, { parse_mode: "Markdown", disable_web_page_preview: false });
        } catch (error) {
            bot.sendMessage(chatId, "⚠️ Terjadi kesalahan saat mengambil data. Coba lagi nanti.");
        }
    });
});

bot.onText(/^\/cekip_me$/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "🔍 Sedang mendeteksi alamat IP kamu...");

    try {
        // Dapatkan IP publik user
        const ipRes = await fetch("https://api64.ipify.org?format=json");
        const ipJson = await ipRes.json();
        const userIp = ipJson.ip;

        // Ambil informasi IP dari API
        const res = await fetch(`https://fastrestapis.fasturl.cloud/tool/whoip?ip=${userIp}`);
        const json = await res.json();

        if (json.status !== 200) {
            return bot.sendMessage(chatId, "❌ Gagal mendapatkan informasi IP. Coba lagi nanti.");
        }

        const data = json.result;
        const info = `🌍 *Informasi IP Kamu*\n\n` +
            `📌 *IP*: ${data.ip}\n` +
            `🔍 *Tipe IP*: ${data.ipType}\n` +
            `🖧 *Network*: ${data.network}\n` +
            `🏢 *ISP*: ${data.isp}\n` +
            `🏛 *Organisasi*: ${data.org}\n` +
            `🆔 *ASN*: ${data.asn} (${data.asnData.asnName})\n` +
            `🗺️ *Negara*: ${data.geoDetails.country} (${data.geoDetails.countryCode})\n` +
            `📍 *Kota*: ${data.locationInsights.city}, ${data.locationInsights.region}\n` +
            `⏳ *Zona Waktu*: ${data.locationInsights.timezone} (GMT ${data.locationInsights.timezoneGmt})\n` +
            `🌐 *Google Maps*: [Klik di sini](${data.googleMapLink})\n` +
            `🛡️ *Ancaman*: ${data.threatData.threatLevel}`;

        bot.sendMessage(chatId, info, { parse_mode: "Markdown", disable_web_page_preview: true });
    } catch (error) {
        bot.sendMessage(chatId, "⚠️ Terjadi kesalahan saat mendeteksi IP. Coba lagi nanti.");
    }
});

bot.onText(/\/alay/, async (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId, "Kirimkan teks nya:")
        .then(() => {
            bot.once("message", async (msg) => {
                const userInput = encodeURIComponent(msg.text);

                try {
                    const response = await fetch(`https://api.siputzx.my.id/api/fun/alay?text=${userInput}`);
                    const data = await response.json();

                    if (data.status) {
                        // Escape karakter khusus agar tidak error di MarkdownV2
                        const alayText = data.result.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');

                        bot.sendMessage(chatId, `📝 Hasil:\n\n\`${alayText}\``, {
                            parse_mode: "MarkdownV2"
                        });
                    } else {
                        bot.sendMessage(chatId, "❌ Gagal mengubah teks ke alay.");
                    }
                } catch (error) {
                    bot.sendMessage(chatId, "❌ Terjadi kesalahan, coba lagi nanti.");
                }
            });
        });
});

// Perintah /tks
bot.onText(/\/tks/, async (msg) => {
    const chatId = msg.chat.id;

    // Kirim pesan awal dan simpan message_id untuk diedit nanti
    const sentMessage = await bot.sendMessage(chatId, "Kirimkan teks yang ingin diubah menjadi ASCII.");
    userSessions[chatId] = { step: "awaiting_text", messageId: sentMessage.message_id };
});

// Menangani input teks dari user
bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!userSessions[chatId]) return; // Abaikan jika user tidak dalam sesi /tks

    if (userSessions[chatId].step === "awaiting_text") {
        userSessions[chatId].text = text; // Simpan teks yang dikirim user
        userSessions[chatId].step = "awaiting_style"; // Ubah status ke pemilihan gaya

        // Edit pesan sebelumnya untuk menampilkan pilihan gaya ASCII
        await bot.editMessageText("Pilih gaya ASCII:", {
            chat_id: chatId,
            message_id: userSessions[chatId].messageId,
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Standard", callback_data: "tks_Standard" }],
                    [{ text: "Slant", callback_data: "tks_Slant" }],
                    [{ text: "Big", callback_data: "tks_Big" }],
                    [{ text: "Ghost", callback_data: "tks_Ghost" }],
                    [{ text: "Lean", callback_data: "tks_Lean" }],
                ],
            },
        });
    }
});

// Menangani pilihan gaya ASCII
bot.on("callback_query", async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    // Pastikan tombol memiliki prefix "tks_"
    if (!data.startsWith("tks_")) return;

    const style = data.replace("tks_", ""); // Ambil nama gaya
    if (!userSessions[chatId] || !userSessions[chatId].text) return;

    const userText = userSessions[chatId].text;

    // Edit pesan menjadi status loading
    await bot.editMessageText("Mengonversi ke ASCII...", {
        chat_id: chatId,
        message_id: userSessions[chatId].messageId,
    });

    figlet.text(userText, { font: style }, async (err, asciiText) => {
        if (err) {
            await bot.editMessageText("Terjadi kesalahan dalam konversi ASCII.", {
                chat_id: chatId,
                message_id: userSessions[chatId].messageId,
            });
            return;
        }

        // Simpan hasil ASCII ke file
        const filePath = `ascii_${chatId}.txt`;
        fs.writeFileSync(filePath, asciiText);

        // Kirim file ke user
        await bot.sendDocument(chatId, filePath);

        // Hapus file setelah terkirim
        fs.unlinkSync(filePath);

        // Hapus pesan sebelumnya
        await bot.deleteMessage(chatId, userSessions[chatId].messageId);

        // Hapus sesi user setelah selesai
        delete userSessions[chatId];
    });
});

function getTime() {
    const date = new Date();
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

function sendErrorLog(error) {
    const errorMessage = `
⚠️ *LOG ERROR TERDETEKSI!*

🕒 *Waktu:* ${getTime()}
📌 *Pesan:* \`${error.message}\`
📄 *Stack:* 
\`\`\`
${error.stack}
\`\`\`
`;

    fs.appendFileSync("error.log", `[${getTime()}] ${error.stack}\n\n`);
    bot.sendMessage(gclog, errorMessage, { parse_mode: "Markdown" });
}

process.on("uncaughtException", (err) => {
    console.error(`❌ Uncaught Exception: ${err.message}`);
    sendErrorLog(err);
});

process.on("unhandledRejection", (reason, promise) => {
    console.error(`❌ Unhandled Rejection: ${reason}`);
    sendErrorLog(reason instanceof Error ? reason : new Error(reason));
});

process.on("SIGINT", () => {
    console.log("⚠️ Proses dihentikan oleh user (SIGINT)");
    process.exit(0);
});

process.on("SIGTERM", () => {
    console.log("⚠️ Proses dihentikan oleh sistem (SIGTERM)");
    process.exit(0);
});

const catchAsync = (fn) => (...args) => fn(...args).catch((err) => sendErrorLog(err));

bot.onText(/\/clone/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Kirimkan teks yang ingin dikloning:");

    bot.once("message", (msg) => {
        if (msg.text.startsWith("/")) return; // Cegah input perintah lain
        const teks = msg.text;
        bot.sendMessage(chatId, "Berapa kali teks ini dikloning?");

        bot.once("message", (msg) => {
            if (isNaN(msg.text) || parseInt(msg.text) <= 0) {
                return bot.sendMessage(chatId, "Jumlah harus angka positif.");
            }

            const jumlah = parseInt(msg.text);
            const hasil = teks.repeat(jumlah);

            const filePath = "./clone.txt";
            fs.writeFileSync(filePath, hasil);

            bot.sendDocument(chatId, filePath, { caption: "Berikut hasil kloning." })
                .then(() => fs.unlinkSync(filePath)) // Hapus file setelah terkirim
                .catch((err) => console.error("Gagal menghapus file:", err));
        });
    });
});

bot.onText(/\/tesai/, async (msg) => {
    const chatId = msg.chat.id;

    if (tesaiUsers.has(chatId)) {
        bot.sendMessage(chatId, "⚠️ Proses AI sedang berjalan di latar belakang. Gunakan tombol Look untuk melihat hasil.");
        return;
    }

    let count = 0;
    let lastResponse = "hai, siapa nama kamu?";
    let filePath = path.join(__dirname, `tesai_${chatId}.txt`);

    // Buat file kosong untuk menyimpan percakapan
    fs.writeFileSync(filePath, "Percakapan AI:\n");

    const sentMsg = await bot.sendMessage(chatId, `Memulai percakapan AI...\nRequest: 0`, {
        reply_markup: {
            inline_keyboard: [[
                { text: "📜 Look", callback_data: `look_tesai_${chatId}` }
            ]]
        }
    });

    // Simpan informasi ke tesaiUsers
    tesaiUsers.set(chatId, { running: true, messageId: sentMsg.message_id, filePath });

    // Jalankan request di latar belakang
    (async function runAI() {
        while (tesaiUsers.has(chatId) && tesaiUsers.get(chatId).running) {
            try {
                const response = await axios.get(`https://api.siputzx.my.id/api/ai/gpt3?prompt=gaya%20bicara%20mu%20dengan%20filsafat&content=${encodeURIComponent(lastResponse)}`);

                if (response.data && response.data.data) {
                    lastResponse = response.data.data;
                    count++;

                    // Simpan ke file
                    fs.appendFileSync(filePath, `Bot: ${lastResponse}\n`);

                    await bot.editMessageText(`Memulai percakapan AI...\nRequest: ${count}`, {
                        chat_id: chatId,
                        message_id: sentMsg.message_id,
                        reply_markup: {
                            inline_keyboard: [[
                                { text: "📜 Look", callback_data: `look_tesai_${chatId}` }
                            ]]
                        }
                    });
                }
            } catch (error) {
                console.error("Error fetching AI response:", error);
                bot.sendMessage(chatId, "Terjadi kesalahan saat mengambil respons dari AI.");
                break;
            }
        }
    })();
});

// Handler untuk "Look"
bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;

    if (query.data === `look_tesai_${chatId}`) {
        if (tesaiUsers.has(chatId)) {
            let userData = tesaiUsers.get(chatId);

            // Hentikan proses AI
            tesaiUsers.delete(chatId);

            // Hapus pesan request
            await bot.deleteMessage(chatId, userData.messageId).catch(() => {});

            // Kirim file percakapan
            let filePath = userData.filePath;
            if (fs.existsSync(filePath)) {
                bot.sendDocument(chatId, filePath).then(() => {
                    fs.unlinkSync(filePath); // Hapus file setelah terkirim
                }).catch(err => console.error("Gagal mengirim file:", err));
            } else {
                bot.sendMessage(chatId, "❌ Tidak ada percakapan yang bisa dilihat.");
            }
        } else {
            bot.sendMessage(chatId, "❌ Tidak ada percakapan yang sedang berlangsung.");
        }
    }
});

bot.onText(/\/randomcat/, async (msg) => {
    const chatId = msg.chat.id;
    const url = "https://api.siputzx.my.id/api/r/cats";
    const filePath = path.join(__dirname, "randomcat.jpg");

    try {
        // Kirim pesan loading
        const loadingMsg = await bot.sendMessage(chatId, "Okey, wait....");

        // Ambil gambar dari API
        const response = await fetch(url);
        const buffer = await response.buffer();

        // Simpan sebagai JPG
        fs.writeFileSync(filePath, buffer);

        // Kirim gambar ke user
        await bot.sendPhoto(chatId, filePath, { caption: "Miaw! 🐱" });

        // Hapus pesan loading setelah gambar dikirim
        await bot.deleteMessage(chatId, loadingMsg.message_id);

        // Hapus file setelah dikirim
        fs.unlinkSync(filePath);
    } catch (error) {
        console.error("Error mengambil gambar kucing:", error);
        bot.sendMessage(chatId, "Gagal mengambil gambar kucing. Coba lagi nanti!");
    }
});

bot.onText(/^\/ping$/, async (msg) => {
    const chatId = msg.chat.id;
    const start = Date.now();

    // Uptime server
    const uptime = os.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;

    // CPU & RAM Usage
    const cpuUsage = os.loadavg()[0].toFixed(2);
    const totalMem = (os.totalmem() / 1024 / 1024).toFixed(0);
    const freeMem = (os.freemem() / 1024 / 1024).toFixed(0);
    const usedMem = totalMem - freeMem;

    // Sistem Operasi & Node.js Version
    const osType = os.type();
    const osRelease = os.release();
    const nodeVersion = process.version;

    // Ping ke Google DNS (8.8.8.8) untuk cek koneksi
    exec("ping -c 1 8.8.8.8", (error, stdout) => {
        const latency = error ? "Timeout" : `${Date.now() - start} ms`;

        // Format hasil
        const message = `
*Server Info*
- OS: ${osType} ${osRelease}
- Node.js: ${nodeVersion}
- CPU Load: ${cpuUsage}%
- RAM: ${usedMem}MB / ${totalMem}MB
- Runtime ${hours}h ${minutes}m ${seconds}s
- Ping ${latency}
        `;
        bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    });
});

bot.onText(/\/liston/, async (msg) => {
    let chatId = msg.chat.id;

    // Cek apakah yang mengakses adalah admin
    if (chatId !== TELEGRAM_USER_ID) {
        return bot.sendMessage(chatId, "❌ Anda tidak memiliki izin untuk menggunakan perintah ini.");
    }

    // Cek apakah ada user yang aktif
    if (activeUsers.size === 0) {
        return bot.sendMessage(chatId, "ℹ️ Tidak ada user yang sedang aktif.");
    }

    // Buat daftar user aktif tanpa link klik
    let list = "👥 *Daftar User Aktif (10 menit terakhir):*\n";
    for (let userId of activeUsers.keys()) {
        list += `- ${userId}\n`; // Hanya menampilkan ID user
    }

    // Kirim daftar user aktif ke admin
    await bot.sendMessage(chatId, list, { parse_mode: "Markdown" });
});

bot.onText(/\/teksanim/, async (msg) => {
    const chatId = msg.chat.id;

    // Minta user mengirimkan teks
    bot.sendMessage(chatId, "Silakan kirimkan teks yang ingin dianimasikan:").then(() => {
        bot.once("message", async (response) => {
            let text = response.text;
            if (!text || text.length === 0) return bot.sendMessage(chatId, "Teks tidak valid!");

            let animMessage = await bot.sendMessage(chatId, "...");
            let animationSteps = [];

            // Gunakan non-breaking space agar Telegram tetap menampilkan spasi
            let fixedText = text.replace(/ /g, "\u00A0"); // Non-breaking space

            // Buat array animasi huruf satu per satu termasuk spasi
            for (let i = 1; i <= fixedText.length; i++) {
                animationSteps.push(fixedText.substring(0, i));
            }

            // Animasi dengan editMessageText
            let index = 0;
            let interval = setInterval(() => {
                if (index >= animationSteps.length) {
                    clearInterval(interval);
                } else {
                    bot.editMessageText(animationSteps[index], {
                        chat_id: chatId,
                        message_id: animMessage.message_id,
                    }).catch(() => clearInterval(interval));
                    index++;
                }
            }, 1000); // Edit setiap 1 detik
        });
    });
});

bot.onText(/\/analisis/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Kirimkan teks yang ingin dianalisis:");
    
    bot.once("message", (msg) => {
        if (msg.text.startsWith("/")) return; // Mencegah perintah lain mengganggu

        const text = msg.text;
        const letters = (text.match(/[a-zA-Z]/g) || []).length;
        const numbers = (text.match(/[0-9]/g) || []).length;
        const symbols = (text.match(/[^a-zA-Z0-9\s]/g) || []).length;

        bot.sendMessage(chatId, `📊 *Hasil Analisis:*\n` +
            `🔤 Huruf: ${letters}\n` +
            `🔢 Angka: ${numbers}\n` +
            `🔣 Simbol: ${symbols}`, { parse_mode: "Markdown" });
    });
});

bot.onText(/\/randangka/, (msg) => {
    const chatId = msg.chat.id;
    gameData[chatId] = { number: Math.floor(Math.random() * 100) + 1, input: "", messageId: null };

    sendGameMessage(chatId, "Tebak angka antara 1 - 100!");
});

bot.on("callback_query", (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    if (!gameData[chatId]) {
        gameData[chatId] = { number: Math.floor(Math.random() * 100) + 1, input: "", messageId: null };
    }

    if (data === "randangka_enter") {
        let guess = parseInt(gameData[chatId].input);
        if (isNaN(guess)) return;

        if (guess > gameData[chatId].number) {
            sendGameMessage(chatId, `Terlalu besar!`);
        } else if (guess < gameData[chatId].number) {
            sendGameMessage(chatId, `Terlalu kecil!`);
        } else {
            sendGameMessage(chatId, `🎉 Benar! Angkanya adalah ${gameData[chatId].number}`, true);
        }
        gameData[chatId].input = "";
    } else if (data === "randangka_hapus") {
        gameData[chatId].input = gameData[chatId].input.slice(0, -1);
        sendGameMessage(chatId, "Tebak angka antara 1 - 100!");
    } else if (data === "randangka_menyerah") {
        sendGameMessage(chatId, `😔 Menyerah! Angkanya adalah ${gameData[chatId].number}`, true);
    } else if (data.startsWith("randangka_angka")) {
        const angka = data.split("_")[2];
        gameData[chatId].input += angka;
        sendGameMessage(chatId, "Tebak angka antara 1 - 100!");
    }

    bot.answerCallbackQuery(callbackQuery.id);
});

function sendGameMessage(chatId, message, deleteAfter = false) {
    const inputDisplay = gameData[chatId]?.input || "_";
    const keyboard = {
        inline_keyboard: [
            ["1", "2", "3"].map((num) => ({ text: num, callback_data: `randangka_angka_${num}` })),
            ["4", "5", "6"].map((num) => ({ text: num, callback_data: `randangka_angka_${num}` })),
            ["7", "8", "9"].map((num) => ({ text: num, callback_data: `randangka_angka_${num}` })),
            [{ text: "0", callback_data: "randangka_angka_0" }, { text: "Hapus", callback_data: "randangka_hapus" }],
            [{ text: "Enter", callback_data: "randangka_enter" }, { text: "Menyerah", callback_data: "randangka_menyerah" }]
        ],
    };

    if (gameData[chatId]?.messageId) {
        bot.editMessageText(`🎯 ${message}\n\n🔢 Input: ${inputDisplay}`, {
            chat_id: chatId,
            message_id: gameData[chatId].messageId,
            reply_markup: keyboard,
        }).catch(() => {});
    } else {
        bot.sendMessage(chatId, `🎯 ${message}\n\n🔢 Input: ${inputDisplay}`, {
            reply_markup: keyboard,
        }).then((sentMessage) => {
            gameData[chatId].messageId = sentMessage.message_id;

            if (deleteAfter) {
                setTimeout(() => {
                    bot.deleteMessage(chatId, sentMessage.message_id).catch(() => {});
                    delete gameData[chatId];
                }, 3000);
            }
        });
    }

    if (deleteAfter) {
        setTimeout(() => {
            if (gameData[chatId]?.messageId) {
                bot.deleteMessage(chatId, gameData[chatId].messageId).catch(() => {});
                delete gameData[chatId];
            }
        }, 3000);
    }
}

bot.onText(/^\/spy2$/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Silakan masukkan judul lagu yang ingin dicari:");
  userSearchResults[chatId] = { results: [], index: 0, messageId: null };
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  if (!userSearchResults[chatId] || userSearchResults[chatId].results.length > 0) return;

  const query = encodeURIComponent(msg.text);
  const apiUrl = `https://fastrestapis.fasturl.cloud/music/spotify?name=${query}`;

  try {
    const response = await axios.get(apiUrl);
    const results = response.data.result;

    if (results.length === 0) {
      return bot.sendMessage(chatId, "Lagu tidak ditemukan.");
    }

    userSearchResults[chatId] = { results, index: 0, messageId: null };
    sendSongDetails(chatId, results[0], 0);
  } catch (error) {
    bot.sendMessage(chatId, "Terjadi kesalahan saat mencari lagu.");
  }
});

async function sendSongDetails(chatId, song, index) {
  let keyboard = [
    [{ text: "Download", callback_data: `spy2_download_${index}` }],
    [{ text: "Keluar", callback_data: "spy2_exit" }],
  ];

  if (index > 0) {
    keyboard.unshift([{ text: "<<", callback_data: `spy2_prev_${index - 1}` }]);
  }
  if (index < userSearchResults[chatId].results.length - 1) {
    keyboard.push([{ text: ">>", callback_data: `spy2_next_${index + 1}` }]);
  }

  const text = `🎵 *${song.title}*\n👨‍🎤 *Artist:* ${song.artist}\n⏱ *Duration:* ${song.duration}\n🔗 [Spotify Link](${song.url})`;

  if (userSearchResults[chatId].messageId) {
    bot.editMessageText(text, {
      chat_id: chatId,
      message_id: userSearchResults[chatId].messageId,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard },
    });
  } else {
    bot.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard },
    }).then((sentMessage) => {
      userSearchResults[chatId].messageId = sentMessage.message_id;
    });
  }
}

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (!userSearchResults[chatId]) return;

  if (data.startsWith("spy2_next_")) {
    const index = parseInt(data.split("_")[2]);
    userSearchResults[chatId].index = index;
    sendSongDetails(chatId, userSearchResults[chatId].results[index], index);
  }

  if (data.startsWith("spy2_prev_")) {
    const index = parseInt(data.split("_")[2]);
    userSearchResults[chatId].index = index;
    sendSongDetails(chatId, userSearchResults[chatId].results[index], index);
  }

  if (data.startsWith("spy2_download_")) {
    const index = parseInt(data.split("_")[2]);
    const song = userSearchResults[chatId].results[index];

    const downloadUrl = `https://fastrestapis.fasturl.cloud/downup/spotifydown?url=${encodeURIComponent(song.url)}`;
    bot.sendMessage(chatId, "🔄 Sedang mendownload lagu...");

    try {
      const response = await axios.get(downloadUrl);
      const songLink = response.data.result.link;

      if (!songLink) return bot.sendMessage(chatId, "Gagal mendapatkan link download.");

      const filePath = path.join(__dirname, "downloads", `${song.title}.mp3`);
      const writer = fs.createWriteStream(filePath);

      const songResponse = await axios({
        url: songLink,
        method: "GET",
        responseType: "stream",
      });

      songResponse.data.pipe(writer);

      writer.on("finish", () => {
        bot.sendAudio(chatId, filePath, {
          title: song.title,
          performer: song.artist,
        }).then(() => {
          fs.unlinkSync(filePath); // Hapus file setelah dikirim
        });
      });

      writer.on("error", () => {
        bot.sendMessage(chatId, "Gagal mengunduh lagu.");
      });
    } catch (error) {
      bot.sendMessage(chatId, "Terjadi kesalahan saat mengunduh lagu.");
    }
  }

  if (data === "spy2_exit") {
    delete userSearchResults[chatId];
    bot.editMessageText("Pencarian lagu telah dihentikan.", {
      chat_id: chatId,
      message_id: query.message.message_id,
    });
  }
});

const animasiStop = (pos) => {
    const panjang = 18; // Panjang animasi
    let hasil = ".".repeat(pos) + "STOP" + ".".repeat(panjang - pos);
    return hasil.slice(0, panjang); // Potong agar panjang tetap
};

bot.onText(/^\/jam$/, async (msg) => {
    const chatId = msg.chat.id;

    // Jika jam sudah berjalan, beri tahu user
    if (jamAktif.has(chatId)) {
        return bot.sendMessage(chatId, "⏳ Jam sudah berjalan!");
    }

    jamAktif.set(chatId, { running: true, posisi: 0, arah: 1 }); // Status update jam

    const getJam = () => {
        return `🕰 *Jam WIB*\n⏳ ${moment().tz("Asia/Jakarta").format("HH:mm:ss")}`;
    };

    const getTombol = (pos) => {
        return {
            inline_keyboard: [[{ text: animasiStop(pos), callback_data: `hapus_jam_${chatId}` }]]
        };
    };

    // Kirim pesan awal
    const sentMsg = await bot.sendMessage(chatId, getJam(), {
        parse_mode: "Markdown",
        reply_markup: getTombol(0)
    });

    // Fungsi untuk memperbarui jam dan animasi tombol setiap detik
    const updateJam = async () => {
        const jamData = jamAktif.get(chatId);
        if (!jamData?.running) return; // Jika dihentikan, keluar

        // Ubah posisi animasi
        if (jamData.posisi === 14) jamData.arah = -1; // Jika sampai ujung kanan, balik kiri
        if (jamData.posisi === 0) jamData.arah = 1;  // Jika sampai ujung kiri, balik kanan
        jamData.posisi += jamData.arah;

        try {
            await bot.editMessageText(getJam(), {
                chat_id: chatId,
                message_id: sentMsg.message_id,
                parse_mode: "Markdown",
                reply_markup: getTombol(jamData.posisi)
            });

            setTimeout(updateJam, 1000); // Jalankan update lagi dalam 1 detik
        } catch (err) {
            jamAktif.delete(chatId); // Hentikan jika terjadi error (misalnya pesan dihapus)
        }
    };

    setTimeout(updateJam, 1000); // Mulai update setelah 1 detik
});

// Fungsi untuk menangani tombol "Hapus"
bot.on("callback_query", async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    if (data.startsWith("hapus_jam_")) {
        jamAktif.delete(chatId); // Hentikan update jam
        await bot.deleteMessage(chatId, callbackQuery.message.message_id);
        await bot.answerCallbackQuery(callbackQuery.id, { text: "🛑 Jam dihentikan!" });
    }
});

bot.onText(/\/stopmotion/, (msg) => {
    const chatId = msg.chat.id;
    stopMotionData[chatId] = { frames: [], totalFrames: null, messageId: null };

    bot.sendMessage(chatId, "Masukkan jumlah frame yang diinginkan:").then((sent) => {
        stopMotionData[chatId].messageId = sent.message_id;
    });
});

bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    if (!stopMotionData[chatId]) return;
    if (msg.text.startsWith("/")) return; // Hindari gangguan dari perintah lain

    let userInput = msg.text.trim();
    let data = stopMotionData[chatId];

    if (data.totalFrames === null) {
        let frameCount = parseInt(userInput);
        if (isNaN(frameCount) || frameCount <= 0) {
            return bot.editMessageText("Jumlah frame harus angka positif! Masukkan ulang:", {
                chat_id: chatId,
                message_id: data.messageId,
            });
        }
        data.totalFrames = frameCount;
        data.frames = [];
        return bot.editMessageText(`Masukkan teks untuk frame ke-1:`, {
            chat_id: chatId,
            message_id: data.messageId,
        });
    } else if (data.frames.length < data.totalFrames) {
        data.frames.push(userInput);
        let nextFrame = data.frames.length + 1;

        if (data.frames.length < data.totalFrames) {
            bot.editMessageText(`Masukkan teks untuk frame ke-${nextFrame}:`, {
                chat_id: chatId,
                message_id: data.messageId,
            });
        } else {
            bot.editMessageText("Semua frame sudah terkumpul! Tekan **Play** untuk mulai animasi.", {
                chat_id: chatId,
                message_id: data.messageId,
                reply_markup: {
                    inline_keyboard: [[{ text: "▶️ Play", callback_data: `play_${chatId}` }]],
                },
            });
        }
    }
});

bot.on("callback_query", async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = stopMotionData[chatId];

    if (!data || !data.frames.length) return;

    if (callbackQuery.data === `play_${chatId}`) {
        let messageId = data.messageId;

        for (let i = 0; i < data.frames.length; i++) {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Delay 1 detik antar frame
            bot.editMessageText(data.frames[i], { chat_id: chatId, message_id: messageId });
        }

        // Tunggu 3 detik sebelum menampilkan pesan selesai
        await new Promise((resolve) => setTimeout(resolve, 3000));
        bot.editMessageText("🎬 Animasi selesai!", {
            chat_id: chatId,
            message_id: messageId,
        });

        bot.answerCallbackQuery(callbackQuery.id);
    }
});

bot.onText(/^\/rngyt$/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Kirimkan URL video YouTube yang ingin dianalisis.");
    
    bot.once("message", async (msg) => {
        const url = msg.text.trim();
        if (!url.startsWith("http")) {
            return bot.sendMessage(chatId, "URL tidak valid! Harap kirimkan URL YouTube yang benar.");
        }

        bot.sendMessage(chatId, "🔍 Mengambil data, mohon tunggu...");

        try {
            const response = await fetch(`https://fastrestapis.fasturl.cloud/aiexperience/ytpoint?url=${encodeURIComponent(url)}`);
            const data = await response.json();

            if (data.status !== 200 || !data.result || !data.result.keyPoints) {
                return bot.sendMessage(chatId, "⚠️ Gagal mengambil data. Pastikan URL valid!");
            }

            const { short_title, keyPoints } = data.result;
            let resultText = `🎯 *Ringkasan Video*: ${short_title}\n\n📌 *Poin Penting*:\n`;

            keyPoints.forEach((item, index) => {
                resultText += `${index + 1}️⃣ *${item.point}*\n   - ${item.summary}\n\n`;
            });

            bot.sendMessage(chatId, resultText, { parse_mode: "Markdown" });

        } catch (error) {
            bot.sendMessage(chatId, "❌ Terjadi kesalahan saat mengambil data.");
            console.error(error);
        }
    });
});

bot.onText(/\/aideck/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "🔍 Kirimkan teks yang ingin dianalisis:");
  
    bot.once("message", async (msg) => {
        if (msg.text.startsWith("/")) return; // Abaikan jika user kirim perintah lain
        const text = encodeURIComponent(msg.text);
        const url = `https://fastrestapis.fasturl.cloud/aiexperience/aitextdetector?text=${text}`;
      
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.status === 200) {
                const result = data.result;
                const responseText = `
🔍 Hasil Analisis AI
📌 Answer:\n${result.answer}
👤 Made By: ${result.madeBy}
🔢 AI Probability: ${result.probabilityAi}
                `;
                bot.sendMessage(chatId, responseText);
            } else {
                bot.sendMessage(chatId, "⚠️ Gagal mendapatkan hasil. Coba lagi.");
            }
        } catch (error) {
            bot.sendMessage(chatId, "❌ Terjadi kesalahan. Pastikan teks valid dan coba lagi.");
        }
    });
});

bot.onText(/\/translate/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Silakan kirim teks yang ingin diterjemahkan.");

    bot.once("message", async (msg) => {
        if (msg.text.startsWith("/")) return; // Hindari menangkap perintah lain

        const userInput = encodeURIComponent(msg.text);
        const apiUrl = `https://fastrestapis.fasturl.cloud/tool/translate?text=${userInput}&target=id`;

        try {
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.status === 200) {
                bot.sendMessage(chatId, `**Hasil Terjemahan:**\n\n${data.result.translatedText}`, { parse_mode: "Markdown" });
            } else {
                bot.sendMessage(chatId, "Terjadi kesalahan saat menerjemahkan.");
            }
        } catch (error) {
            bot.sendMessage(chatId, "Gagal menghubungi API terjemahan.");
        }
    });
});

bot.onText(/\/itung/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Masukkan angka yang ingin dihitung:")
        .then(sentMessage => {
            bot.once("message", (response) => {
                const number = parseInt(response.text);
                if (isNaN(number) || number < 0) {
                    return bot.sendMessage(chatId, "Harap masukkan angka yang valid.");
                }

                let count = 0;
                const interval = setInterval(() => {
                    if (count > number) {
                        clearInterval(interval);
                        bot.editMessageText("Hitungan selesai!", {
                            chat_id: chatId,
                            message_id: sentMessage.message_id
                        });
                        return;
                    }

                    bot.editMessageText(`Menghitung: ${count}`, {
                        chat_id: chatId,
                        message_id: sentMessage.message_id
                    }).catch(() => clearInterval(interval)); // Hentikan jika ada error

                    count++;
                }, 1000); // Update setiap 1 detik
            });
        });
});

bot.onText(/\/hd/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    bot.sendMessage(chatId, "Kirimkan URL gambar yang ingin di-upscale.");

    const handler = async (responseMsg) => {
        if (responseMsg.chat.id !== chatId || responseMsg.from.id !== userId) return;

        if (!responseMsg.text || !responseMsg.text.startsWith("http")) {
            bot.sendMessage(chatId, "Harap kirimkan URL gambar yang valid.");
            return bot.removeListener("message", handler);
        }

        const imageUrl = encodeURIComponent(responseMsg.text);
        const apiUrl = `https://api.siputzx.my.id/api/iloveimg/upscale?image=${imageUrl}`;

        bot.sendMessage(chatId, "Memproses gambar, harap tunggu...");
        bot.removeListener("message", handler);

        try {
            const response = await axios({
                url: apiUrl,
                method: "GET",
                responseType: "arraybuffer",
            });

            const filePath = `upscaled_${Date.now()}.jpg`;
            fs.writeFileSync(filePath, response.data);

            bot.sendPhoto(chatId, fs.createReadStream(filePath), { caption: "Berhasil di-upscale!" })
                .then(() => fs.unlinkSync(filePath)) // Hapus file setelah dikirim
                .catch(() => bot.sendMessage(chatId, "Gagal mengirim gambar."));
        } catch (error) {
            bot.sendMessage(chatId, "Terjadi kesalahan saat memproses gambar.");
        }
    };

    bot.on("message", handler);
});

bot.onText(/\/dewatermark/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Kirimkan URL gambar yang ingin dihapus watermarknya.");

    bot.once("message", async (msg) => {
        if (!msg.text.startsWith("http")) {
            return bot.sendMessage(chatId, "❌ URL tidak valid. Silakan kirim ulang perintah.");
        }

        const imageUrl = msg.text;
        const apiUrl = `https://api.siputzx.my.id/api/tools/dewatermark?url=${encodeURIComponent(imageUrl)}`;

        bot.sendMessage(chatId, "⏳ Sedang memproses gambar...");

        try {
            // Unduh gambar dari API
            const response = await axios.get(apiUrl, { responseType: "arraybuffer" });
            
            // Pastikan direktori penyimpanan ada
            const outputDir = path.join(__dirname, "downloads");
            if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

            // Path file hasil
            const jpgPath = path.join(outputDir, "hasil_dewatermark.jpg");

            // Simpan langsung sebagai .jpg
            fs.writeFileSync(jpgPath, response.data);

            // Cek apakah file benar-benar ada
            if (!fs.existsSync(jpgPath)) {
                throw new Error("File hasil tidak ditemukan setelah penyimpanan.");
            }

            // Kirim hasil ke user
            bot.sendPhoto(chatId, jpgPath, { caption: "✅ Gambar tanpa watermark" });

            // Hapus file setelah dikirim
            setTimeout(() => fs.unlinkSync(jpgPath), 5000);
        } catch (error) {
            console.error("Error:", error.message);
            bot.sendMessage(chatId, "❌ Gagal memproses gambar. Coba lagi nanti.");
        }
    });
});

// Daftar nama bulan dalam bahasa Indonesia
const bulanIndonesia = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

bot.onText(/\/kalender/, async (msg) => {
    const chatId = msg.chat.id;

    // Mengatur waktu ke WIB (GMT+7)
    const now = new Date();
    now.setHours(now.getHours() + 7); // Tambah 7 jam agar sesuai WIB
    const bulanSekarang = now.getMonth() + 1; // getMonth() dimulai dari 0
    const namaBulan = bulanIndonesia[bulanSekarang - 1];

    const apiUrl = `https://fastrestapis.fasturl.cloud/maker/calendar/advanced?month=${bulanSekarang}&year=2025`;

    bot.sendMessage(chatId, `Mengambil kalender bulan ${namaBulan} 2025...`);

    try {
        // Mengunduh gambar kalender dari API
        const response = await axios.get(apiUrl, { responseType: "arraybuffer" });
        const imgPath = `kalender_${chatId}.jpg`;

        // Simpan gambar sementara
        fs.writeFileSync(imgPath, response.data);

        // Kirim gambar ke user
        await bot.sendPhoto(chatId, fs.createReadStream(imgPath), { caption: `Kalender bulan ${namaBulan} 2025` });

        // Hapus file setelah dikirim
        fs.unlinkSync(imgPath);
    } catch (error) {
        bot.sendMessage(chatId, "Gagal mengambil kalender. Coba lagi nanti.");
        console.error("Error fetching calendar image:", error);
    }
});

const getKeyboard = (chatId) => {
    const currentInput = kalkulatorData[chatId] || "0";
    return {
        reply_markup: {
            inline_keyboard: [
                [{ text: "7", callback_data: "calc_7" }, { text: "8", callback_data: "calc_8" }, { text: "9", callback_data: "calc_9" }, { text: "÷", callback_data: "calc_/" }],
                [{ text: "4", callback_data: "calc_4" }, { text: "5", callback_data: "calc_5" }, { text: "6", callback_data: "calc_6" }, { text: "×", callback_data: "calc_*" }],
                [{ text: "1", callback_data: "calc_1" }, { text: "2", callback_data: "calc_2" }, { text: "3", callback_data: "calc_3" }, { text: "−", callback_data: "calc_-" }],
                [{ text: "0", callback_data: "calc_0" }, { text: "C", callback_data: "calc_clear" }, { text: "⌫", callback_data: "calc_back" }, { text: "+", callback_data: "calc_+" }],
                [{ text: "=", callback_data: "calc_equal" }, { text: "❌ Keluar", callback_data: "calc_exit" }]
            ]
        }
    };
};

// Menangani perintah /kalkulator
bot.onText(/\/kalkulator/, (msg) => {
    const chatId = msg.chat.id;
    kalkulatorData[chatId] = ""; // Reset input kalkulator
    bot.sendMessage(chatId, "Kalkulator\n\n0", getKeyboard(chatId));
});

// Menangani input dari tombol kalkulator
bot.on("callback_query", (query) => {
    if (!query.data.startsWith("calc_")) return; // Filter agar hanya menangani tombol kalkulator

    const chatId = query.message.chat.id;
    let currentInput = kalkulatorData[chatId] || "";
    const action = query.data.replace("calc_", ""); // Menghapus prefix "calc_"

    if (action === "clear") {
        currentInput = "";
    } else if (action === "back") {
        currentInput = currentInput.slice(0, -1);
    } else if (action === "equal") {
        try {
            currentInput = eval(currentInput).toString(); // Menghitung hasil
        } catch (error) {
            currentInput = "Error";
        }
    } else if (action === "exit") {
        bot.deleteMessage(chatId, query.message.message_id);
        return;
    } else {
        currentInput += action;
    }

    kalkulatorData[chatId] = currentInput;
    bot.editMessageText(`Kalkulator\n\n${currentInput || "0"}`, {
        chat_id: chatId,
        message_id: query.message.message_id,
        ...getKeyboard(chatId),
    });

    bot.answerCallbackQuery(query.id);
});

bot.onText(/\/gempa/, async (msg) => {
    const chatId = msg.chat.id;
    const url = "https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json";

    try {
        const { data } = await axios.get(url);
        const gempa = data.Infogempa.gempa;

        // Ambil gambar Shakemap
        const shakemapUrl = `https://data.bmkg.go.id/DataMKG/TEWS/${gempa.Shakemap}`;

        // Format caption
        const caption = `📢 *Info Gempa BMKG* 📢

📅 *Tanggal:* ${gempa.Tanggal}  
🕗 *Waktu:* ${gempa.Jam}  
📍 *Koordinat:* ${gempa.Coordinates}  
📏 *Magnitude:* ${gempa.Magnitude}  
🌊 *Kedalaman:* ${gempa.Kedalaman}  
📌 *Wilayah:* ${gempa.Wilayah}  
⚠️ *Potensi:* ${gempa.Potensi}  
👥 *Dirasakan:* ${gempa.Dirasakan}`;

        // Kirim gambar dengan caption
        await bot.sendPhoto(chatId, shakemapUrl, { caption, parse_mode: "Markdown" });

    } catch (error) {
        console.error("Error mengambil data gempa:", error);
        bot.sendMessage(chatId, "⚠️ Gagal mengambil data gempa. Coba lagi nanti.");
    }
});

bot.on("message", (msg) => {
    let chatId = msg.chat.id;
    activeUsers.set(chatId, Date.now()); // Simpan waktu terakhir user aktif
});

setInterval(() => {
    let now = Date.now();
    for (let [userId, lastActive] of activeUsers) {
        if (now - lastActive > 10 * 60 * 1000) { // 10 menit dalam milidetik
            activeUsers.delete(userId); // Hapus user dari daftar aktif
        }
    }
}, 60 * 1000); // Cek setiap 1 menit

bot.on("polling_error", async (error) => {
    if (error.response && error.response.parameters) {
        rateLimited = true;
        retryAfter = error.response.parameters.retry_after;

        console.log(`Bot terkena rate limit! Retry dalam ${retryAfter} detik.`);

        // Kirim peringatan ke semua user yang masih aktif
        for (let userId of activeUsers.keys()) {
            await bot.sendMessage(userId, `⚠️ Maaf, bot sedang terkena rate limit.\nSilakan coba lagi dalam ${retryAfter} detik.`);
        }

        // Reset status setelah waktu habis
        setTimeout(() => {
            rateLimited = false;
            retryAfter = 0;
        }, retryAfter * 1000);
    }
});

bot.onText(/\/ekali/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Masukkan angka yang ingin dikalikan:");

    bot.once("message", (msg) => {
        let num = parseInt(msg.text);
        if (isNaN(num) || num < 0) {
            return bot.sendMessage(chatId, "Harap masukkan angka positif!");
        }

        let result = BigInt(1);
        let formula = `${num}! = `;
        for (let i = BigInt(num); i > 0; i--) {
            result *= i;
            formula += (i === BigInt(1)) ? `${i} = ${result}` : `${i} × `;
        }

        // Fungsi untuk membagi pesan jika terlalu panjang
        function sendLongMessage(chatId, text) {
            const maxLength = 4000; // Batas aman sebelum 4096 karakter
            while (text.length > maxLength) {
                bot.sendMessage(chatId, text.slice(0, maxLength));
                text = text.slice(maxLength);
            }
            bot.sendMessage(chatId, text);
        }

        sendLongMessage(chatId, formula);
    });
});

bot.onText(/\/ttstalk/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Silakan kirimkan username TikTok yang ingin Anda stalk:");
  
  bot.once("message", async (response) => {
    const username = response.text.trim();
    if (!username.startsWith("/")) {
      try {
        const apiUrl = `https://api.siputzx.my.id/api/stalk/tiktok?username=${username}`;
        const { data } = await axios.get(apiUrl);

        if (data.status && data.data.user) {
          const user = data.data.user;
          const stats = data.data.stats;

          const caption = `👤 *Profil TikTok: ${user.nickname}* (@${user.uniqueId})\n\n` +
            `✅ *Terverifikasi:* ${user.verified ? "Ya" : "Tidak"}\n` +
            `📍 *Region:* ${user.region}\n` +
            `💬 *Bio:* ${user.signature || "-"}\n\n` +
            `📊 *Statistik:*\n` +
            `👥 *Followers:* ${stats.followerCount.toLocaleString()}\n` +
            `🎥 *Video:* ${stats.videoCount.toLocaleString()}\n` +
            `❤️ *Likes:* ${stats.heartCount.toLocaleString()}`;

          bot.sendPhoto(chatId, user.avatarMedium, { caption, parse_mode: "Markdown" });
        } else {
          bot.sendMessage(chatId, "❌ Username tidak ditemukan atau akun private.");
        }
      } catch (error) {
        bot.sendMessage(chatId, "⚠️ Terjadi kesalahan saat mengambil data.");
      }
    } else {
      bot.sendMessage(chatId, "❌ Username tidak valid.");
    }
  });
});

bot.onText(/^\/tourl2$/, (msg) => {
  const chatId = msg.chat.id;
  uploadStatus[chatId] = "waiting_for_photo"; // Set status user
  bot.sendMessage(chatId, "Kirimkan file foto yang ingin diupload.");
});

bot.on("photo", async (msg) => {
  const chatId = msg.chat.id;
  if (uploadStatus[chatId] !== "waiting_for_photo") return;

  const fileId = msg.photo[msg.photo.length - 1].file_id;

  try {
    const file = await bot.getFile(fileId);
    const filePath = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;
    const response = await axios.get(filePath, { responseType: "stream" });

    const fileName = `temp_${Date.now()}.jpg`;
    const fileStream = fs.createWriteStream(fileName);
    response.data.pipe(fileStream);

    fileStream.on("finish", async () => {
      const form = new FormData();
      form.append("reqtype", "fileupload");
      form.append("fileToUpload", fs.createReadStream(fileName));

      const uploadResponse = await axios.post("https://catbox.moe/user/api.php", form, {
        headers: form.getHeaders(),
      });

      console.log("Catbox Response:", uploadResponse.data);

      if (typeof uploadResponse.data !== "string") {
        throw new Error("Invalid response from Catbox");
      }

      bot.sendMessage(chatId, `✅ Foto berhasil diupload!\n🔗 ${uploadResponse.data}`, {
        disable_web_page_preview: true,
      });

      fs.unlinkSync(fileName);
      delete uploadStatus[chatId];
    });
  } catch (error) {
    console.error("Upload Error:", error);
    bot.sendMessage(chatId, "❌ Gagal mengupload foto.");
    delete uploadStatus[chatId];
  }
});

bot.onText(/\/cuaca (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const city = match[1];

    try {
        const url = `https://fastrestapis.fasturl.cloud/search/meteorology?location=${encodeURIComponent(city)}`;
        const response = await axios.get(url);
        const data = response.data;

        if (data.status !== 200 || !data.result) {
            return bot.sendMessage(chatId, "⚠️ Data cuaca tidak ditemukan untuk kota tersebut.");
        }

        // Gunakan nama variabel lain untuk menghindari konflik
        const { 
            city: cityName, latitude, longitude, temperature, condition, humidity, 
            wind, precipitation, cloudCover, visibility, sunrise, sunset 
        } = data.result;

        const message = `🌍 *Cuaca di ${cityName}*\n`
            + `🌡️ Suhu: ${temperature}\n`
            + `☁️ Kondisi: ${condition}\n`
            + `💧 Kelembaban: ${humidity}\n`
            + `🌬️ Angin: ${wind}\n`
            + `🌧️ Curah Hujan: ${precipitation}\n`
            + `☁️ Tutupan Awan: ${cloudCover}\n`
            + `👀 Jarak Pandang: ${visibility}\n\n`
            + `📍 Koordinat: ${latitude}, ${longitude}`;

        bot.sendMessage(chatId, message, { parse_mode: "Markdown" });

    } catch (error) {
        console.error(error);
        bot.sendMessage(chatId, "❌ Terjadi kesalahan saat mengambil data cuaca.");
    }
});

bot.onText(/\/igstalk/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Masukkan username Instagram yang ingin dicari:");

    bot.once("message", async (response) => {
        const username = response.text.trim();
        if (!username) return bot.sendMessage(chatId, "Username tidak boleh kosong.");

        const apiUrl = `https://api.siputzx.my.id/api/stalk/Instagram?user=${username}`;

        try {
            const { data } = await axios.get(apiUrl);
            if (!data.status) return bot.sendMessage(chatId, "Username tidak ditemukan.");

            const userInfo = data.data.user;
            const caption = `🔍 *Instagram Profile* 🔍\n\n` +
                `👤 *Username:* ${escapeMarkdown(userInfo.username)}\n` +
                `📛 *Nama Lengkap:* ${escapeMarkdown(userInfo.full_name)}\n` +
                `📖 *Bio:* ${escapeMarkdown(userInfo.biography)}\n` +
                `👥 *Followers:* ${userInfo.follower_count}\n` +
                `👤 *Following:* ${userInfo.following_count}\n` +
                `📸 *Total Postingan:* ${userInfo.media_count}`;

            bot.sendPhoto(chatId, userInfo.profile_pic_url, { caption, parse_mode: "MarkdownV2" });
        } catch (error) {
            bot.sendMessage(chatId, "Terjadi kesalahan saat mengambil data.");
        }
    });
});

bot.onText(/^\/spy$/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Masukkan judul lagu yang ingin dicari:");

    bot.once("message", async (msg) => {
        const query = msg.text;
        const searchUrl = `https://fastrestapis.fasturl.cloud/music/spotify?name=${encodeURIComponent(query)}`;

        try {
            const response = await axios.get(searchUrl);
            const result = response.data.result;

            if (!result || result.length === 0) {
                return bot.sendMessage(chatId, "❌ Lagu tidak ditemukan.");
            }

            const lagu = result[0]; // Ambil lagu pertama
            const songInfo = `🎵 *Judul:* ${lagu.title}\n🎤 *Artis:* ${lagu.artist}\n⏳ *Durasi:* ${lagu.duration}\n🔗 [Spotify Link](${lagu.url})`;

            bot.sendMessage(chatId, songInfo, {
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "⬇ Download", callback_data: `download_${lagu.url}` }]
                    ]
                }
            });

        } catch (error) {
            bot.sendMessage(chatId, "⚠ Terjadi kesalahan saat mencari lagu.");
        }
    });
});

// Handle tombol download
bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data.startsWith("download_")) {
        const songUrl = data.replace("download_", "");
        const downloadUrl = `https://fastrestapis.fasturl.cloud/downup/spotifydown?url=${encodeURIComponent(songUrl)}`;

        bot.sendMessage(chatId, "⏳ Sedang mengunduh lagu, harap tunggu...");

        try {
            const response = await axios.get(downloadUrl);
            const result = response.data.result;

            if (!result || !result.link) {
                return bot.sendMessage(chatId, "❌ Gagal mengunduh lagu.");
            }

            bot.sendAudio(chatId, result.link, {
                caption: `🎵 *${result.metadata.title}* - ${result.metadata.artists}`,
                parse_mode: "Markdown"
            });

        } catch (error) {
            bot.sendMessage(chatId, "⚠ Terjadi kesalahan saat mengunduh lagu.");
        }
    }
});

bot.onText(/\/artime/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Masukkan nama untuk mencari arti nama:');

    bot.once('message', async (nameMsg) => {
        const userName = nameMsg.text;
        try {
            const response = await axios.get(`https://api.siputzx.my.id/api/primbon/artinama?nama=${userName}`);
            const result = response.data.data;
            if (result) {
                const message = `Nama: ${result.nama}\n\nArti: ${result.arti}\n\nCatatan: ${result.catatan}`;
                bot.sendMessage(chatId, message);
            } else {
                bot.sendMessage(chatId, 'Tidak ditemukan arti untuk nama tersebut.');
            }
        } catch (error) {
            bot.sendMessage(chatId, 'Terjadi kesalahan saat mengambil arti nama.');
        }
    });
});

async function fetchRobloxData(userId) {
    const endpoints = {
        userInfo: `https://users.roblox.com/v1/users/${userId}`,
        userSocials: `https://users.roblox.com/v1/users/${userId}/social`,
        userInventory: `https://inventory.roblox.com/v1/users/${userId}/inventory`,
        userPresence: "https://presence.roblox.com/v1/presence/users",
        userGroups: `https://groups.roblox.com/v1/users/${userId}/groups/roles`
    };
    
    try {
        const [userInfo, userSocials, userInventory, userGroups] = await Promise.all([
            cloudscraper.get(endpoints.userInfo).then(JSON.parse).catch(() => null),
            cloudscraper.get(endpoints.userSocials).then(JSON.parse).catch(() => null),
            cloudscraper.get(endpoints.userInventory).then(JSON.parse).catch(() => null),
            cloudscraper.get(endpoints.userGroups).then(JSON.parse).catch(() => null)
        ]);
        
        const userPresence = await cloudscraper.post(endpoints.userPresence, {
            json: { userIds: [userId] }
        }).then(JSON.parse).catch(() => null);

        return { userInfo, userSocials, userInventory, userPresence, userGroups };
    } catch (error) {
        return null;
    }
}

// **Cek apakah file pengaturan ada**
if (fs.existsSync(settingsFile)) {
    const data = JSON.parse(fs.readFileSync(settingsFile));
    autoAI = data.autoAI || {};
    promptAI = data.promptAI || {};
}

// **Fungsi menyimpan pengaturan**
function saveSettings() {
    fs.writeFileSync(settingsFile, JSON.stringify({ autoAI, promptAI }, null, 2));
}

// **Tombol ON/OFF AutoAI**
bot.onText(/^\/autoai$/, (msg) => {
    const chatId = msg.chat.id;
    const status = autoAI[chatId] ? "ON" : "OFF";
    
    bot.sendMessage(chatId, `⚙️ AutoAI saat ini: *${status}*`, {
        parse_mode: "Markdown",
        reply_markup: {
            inline_keyboard: [
                [{ text: autoAI[chatId] ? "🔴 OFF" : "🟢 ON", callback_data: `toggle_autoai_${chatId}` }]
            ]
        }
    });
});

bot.on("callback_query", (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data.startsWith("toggle_autoai_")) {
        autoAI[chatId] = !autoAI[chatId];
        saveSettings();
        const status = autoAI[chatId] ? "ON" : "OFF";
        
        bot.answerCallbackQuery(query.id, { text: `AutoAI ${status}` });
        bot.editMessageText(`⚙️ AutoAI saat ini: *${status}*`, {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [{ text: autoAI[chatId] ? "🔴 OFF" : "🟢 ON", callback_data: `toggle_autoai_${chatId}` }]
                ]
            }
        });
    }
});

// **Atur Prompt AI Per User**
bot.onText(/\/promptai/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "📝 Silakan kirim prompt baru untuk AI:");
    promptAI[chatId] = promptAI[chatId] || {};
    promptAI[chatId].waitingForPrompt = true;
    saveSettings();
});

// **Simpan Prompt yang Dikirim User**
bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (promptAI[chatId]?.waitingForPrompt && text && !text.startsWith("/")) {
        promptAI[chatId] = { style: text }; // Set style unik per user
        saveSettings();
        bot.sendMessage(chatId, `✅ Prompt AI diperbarui:\n*${text}*`, { parse_mode: "Markdown" });
    }
});

// **Respon AI Otomatis**
bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || text.startsWith("/") || !autoAI[chatId]) return;
    
    // **Gunakan sessionId dan style per user**
    const userSessionId = chatId;
    const userPrompt = promptAI[chatId]?.style || "Gunakan bahasa Indonesia";

    const apiUrl = `https://fastrestapis.fasturl.cloud/aillm/superqwen?ask=${encodeURIComponent(text)}&style=${encodeURIComponent(userPrompt)}&sessionId=${userSessionId}&model=qwen-max-latest&mode=search`;

    try {
        const response = await axios.get(apiUrl);
        const result = response.data.result.replace(/\n+/g, "\n");
        bot.sendMessage(chatId, result);
    } catch (error) {
        bot.sendMessage(chatId, "❌ Terjadi kesalahan saat mengambil respon dari AI.");
    }
});

bot.onText(/\/text2binary/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Kirimkan teks yang ingin dikonversi ke biner.")
        .then(() => {
            bot.once("message", async (msg) => {
                if (msg.text.startsWith("/")) return; // Abaikan jika user mengirim command lain

                const userInput = encodeURIComponent(msg.text);
                const apiUrl = `https://api.siputzx.my.id/api/tools/text2binary?content=${userInput}`;

                try {
                    const response = await fetch(apiUrl);
                    const result = await response.json();

                    if (result.status && result.data) {
                        bot.sendMessage(chatId, `Hasil biner:\n\`${result.data}\``, { parse_mode: "Markdown" });
                    } else {
                        bot.sendMessage(chatId, "Terjadi kesalahan dalam konversi.");
                    }
                } catch (error) {
                    bot.sendMessage(chatId, "Gagal mengambil data dari API.");
                }
            });
        });
});

bot.onText(/\/binary2text/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Kirimkan kode biner yang ingin dikonversi ke teks.")
        .then(() => {
            bot.once("message", async (msg) => {
                if (msg.text.startsWith("/")) return; // Abaikan jika user mengirim command lain

                const userInput = encodeURIComponent(msg.text);
                const apiUrl = `https://api.siputzx.my.id/api/tools/binary2text?content=${userInput}`;

                try {
                    const response = await fetch(apiUrl);
                    const result = await response.json();

                    if (result.status && result.data) {
                        bot.sendMessage(chatId, `Hasil teks:\n\`${result.data}\``, { parse_mode: "Markdown" });
                    } else {
                        bot.sendMessage(chatId, "Terjadi kesalahan dalam konversi.");
                    }
                } catch (error) {
                    bot.sendMessage(chatId, "Gagal mengambil data dari API.");
                }
            });
        });
});

bot.onText(/\/getpp/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `Silakan kirimkan username Telegram yang ingin diambil foto profilnya tanpa "@".`);

    bot.once("message", async (msg) => {
        const username = msg.text.trim();
        if (!username) return bot.sendMessage(chatId, "Username tidak boleh kosong.");

        const apiUrl = `https://fastrestapis.fasturl.cloud/stalk/telegram?username=${username}`;
        
        try {
            const response = await axios.get(apiUrl);
            if (response.data.status !== 200 || !response.data.result.imageUrl) {
                return bot.sendMessage(chatId, "Gagal mengambil foto profil. Pastikan username benar.");
            }

            const imageUrl = response.data.result.imageUrl;
            const filePath = path.join(__dirname, "profile.jpg");

            const downloadImage = async (url, filepath) => {
                const writer = fs.createWriteStream(filepath);
                const res = await axios({
                    url,
                    method: 'GET',
                    responseType: 'stream',
                });
                res.data.pipe(writer);
                return new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });
            };

            await downloadImage(imageUrl, filePath);
            bot.sendPhoto(chatId, filePath, { caption: `Foto profil @${username}` });

            // Hapus file setelah dikirim
            setTimeout(() => fs.unlinkSync(filePath), 5000);
        } catch (error) {
            bot.sendMessage(chatId, "Terjadi kesalahan saat mengambil foto profil.");
        }
    });
});

bot.onText(/\/yts/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    ytsSessions[userId] = { step: 1 };
    bot.sendMessage(chatId, "Masukkan judul video YouTube yang ingin Anda cari:");
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userInput = msg.text?.trim();

    if (!ytsSessions[userId]) return;
    if (userInput.startsWith('/')) return;

    const session = ytsSessions[userId];

    if (session.step === 1) {
        session.title = userInput;
        session.step = 2;

        bot.sendMessage(chatId, "Pilih kualitas video:", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '360p', callback_data: `yts_quality_360_${userId}` }],
                    [{ text: '480p', callback_data: `yts_quality_480_${userId}` }],
                    [{ text: '720p', callback_data: `yts_quality_720_${userId}` }],
                    [{ text: '1080p', callback_data: `yts_quality_1080_${userId}` }]
                ]
            }
        });
    }
});

bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;
    const session = ytsSessions[userId];

    if (!session) return;

    if (data.startsWith(`yts_quality_`)) {
        if (!data.endsWith(`_${userId}`)) return;

        session.quality = data.split('_')[2];
        fetchYouTubeVideo(chatId, userId);
    } else if (data === `yts_confirm_${userId}`) {
        bot.sendMessage(chatId, "📥 Mengunduh video, harap tunggu...");
        downloadAndSendVideo(chatId, userId);
    } else if (data === `yts_cancel_${userId}`) {
        bot.sendMessage(chatId, "Pencarian dibatalkan.");
        delete ytsSessions[userId];
    }
});

async function fetchYouTubeVideo(chatId, userId) {
    const session = ytsSessions[userId];
    if (!session) return;

    const apiUrl = `https://fastrestapis.fasturl.cloud/downup/ytdown-v2?name=${encodeURIComponent(session.title)}&format=mp4&quality=${session.quality}`;
    
    try {
        const response = await axios.get(apiUrl);
        if (response.data.status !== 200) {
            bot.sendMessage(chatId, "⚠️ Gagal mengambil data video.");
            delete ytsSessions[userId];
            return;
        }

        const result = response.data.result;
        session.title = result.title;
        session.thumbnail = result.metadata.thumbnail;
        session.mediaUrl = result.media;

        bot.sendPhoto(chatId, session.thumbnail, {
            caption: `🔍 *Apakah ini video yang Anda cari?*\n\n📌 *Judul:* ${result.title}\n👤 *Channel:* ${result.author.name}\n👁️ *Views:* ${result.metadata.views}\n\nPilih opsi:`,
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [{ text: '✅ Ya', callback_data: `yts_confirm_${userId}` }],
                    [{ text: '❌ Tidak', callback_data: `yts_cancel_${userId}` }]
                ]
            }
        });

    } catch (error) {
        bot.sendMessage(chatId, "❌ Terjadi kesalahan saat mengambil data.");
        delete ytsSessions[userId];
    }
}

async function downloadAndSendVideo(chatId, userId) {
    const session = ytsSessions[userId];
    if (!session) return;

    const videoUrl = session.mediaUrl;
    const fileName = `yts_${userId}.mp4`;
    const filePath = path.join(__dirname, fileName);

    try {
        const response = await axios({
            url: videoUrl,
            method: 'GET',
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        writer.on('finish', async () => {
            bot.sendVideo(chatId, filePath, { caption: `🎬 *${session.title}*\n\n✅ Unduhan berhasil!`, parse_mode: "Markdown" });

            setTimeout(() => {
                fs.unlinkSync(filePath);
            }, 30000); // Hapus file setelah 30 detik

            delete ytsSessions[userId];
        });

        writer.on('error', () => {
            bot.sendMessage(chatId, "❌ Gagal mengunduh video.");
            delete ytsSessions[userId];
        });

    } catch (error) {
        bot.sendMessage(chatId, "❌ Terjadi kesalahan saat mengunduh video.");
        delete ytsSessions[userId];
    }
}

bot.onText(/^\/brat(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const text = match[1];

    if (!text) {
        return bot.sendMessage(chatId, "Gunakan format: `/brat [teks]`\nContoh: `/brat I love you`", { parse_mode: "Markdown" });
    }

    const apiUrl = `https://api.siputzx.my.id/api/m/brat?text=${encodeURIComponent(text)}&isVideo=false&delay=500`;

    try {
        // Ambil gambar dari API
        const response = await axios.get(apiUrl, { responseType: "arraybuffer" });
        const filePath = path.join(__dirname, "brat.png");

        // Simpan gambar
        fs.writeFileSync(filePath, response.data);

        // Kirim gambar sebagai stiker
        await bot.sendSticker(chatId, fs.createReadStream(filePath));

        // Hapus file setelah dikirim
        fs.unlinkSync(filePath);
    } catch (error) {
        console.error("Error:", error);
        bot.sendMessage(chatId, "Gagal mengambil gambar.");
    }
});

// 🔹 Handle /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (!users[chatId]) {
        bot.sendMessage(chatId, "🔐 Anda belum punya akun! Gunakan `/register`.");
        return;
    }
    bot.sendMessage(chatId, "✅ Selamat datang kembali!");
});

// 🔹 Handle /register
const OWNER_ID = "6202819748"; // Ganti dengan ID Telegram Pengembang (Admin Utama)

bot.onText(/\/kbbi/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Silakan kirimkan kata yang ingin dicari di KBBI:");

    bot.once("message", async (msg) => {
        const word = msg.text.trim();
        const url = `https://fastrestapis.fasturl.cloud/search/kbbi?word=${encodeURIComponent(word)}`;

        try {
            const response = await axios.get(url);
            const data = response.data;

            if (data.status !== 200 || !data.result || !data.result.definitions.length) {
                bot.sendMessage(chatId, `❌ Kata *"${word}"* tidak ditemukan dalam KBBI.`, { parse_mode: "Markdown" });
                return;
            }

            kbbiData[chatId] = {
                word: word,
                definitions: data.result.definitions,
                index: 0
            };

            sendDefinition(chatId);

        } catch (error) {
            bot.sendMessage(chatId, "⚠️ Terjadi kesalahan saat mengambil data dari KBBI.");
            console.error(error);
        }
    });
});

bot.on("callback_query", (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    if (!kbbiData[chatId]) return;

    if (data === "kbbi_next") {
        kbbiData[chatId].index++;
    } else if (data === "kbbi_prev") {
        kbbiData[chatId].index--;
    } else if (data === "kbbi_exit") {
        bot.deleteMessage(chatId, callbackQuery.message.message_id);
        delete kbbiData[chatId];
        return;
    }

    sendDefinition(chatId, callbackQuery.message.message_id);
});

function sendDefinition(chatId, messageId = null) {
    const { word, definitions, index } = kbbiData[chatId];
    const def = definitions[index];

    let hasil = `📖 *KBBI: ${word}*\n\n`;
    hasil += `📌 *${def.term}*\n`;
    hasil += `🔹 Pengucapan: _${def.pronunciation}_\n`;
    hasil += `🔹 Kelas Kata: _${def.class}_\n`;
    hasil += `🔹 Arti: ${def.meaning}\n\n`;
    hasil += `(${index + 1}/${definitions.length})`;

    let buttons = [];
    if (index > 0) buttons.push({ text: "«", callback_data: "kbbi_prev" });
    if (index < definitions.length - 1) buttons.push({ text: "»", callback_data: "kbbi_next" });
    buttons.push({ text: "❌ Exit", callback_data: "kbbi_exit" });

    const options = {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: [buttons] }
    };

    if (messageId) {
        bot.editMessageText(hasil, { chat_id: chatId, message_id: messageId, ...options });
    } else {
        bot.sendMessage(chatId, hasil, options);
    }
}

bot.onText(/^\/ai$/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    aiSessions[userId] = { step: 1 };

    bot.sendMessage(chatId, "🔍 Pilih mode AI:", {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Search', callback_data: `ai_mode_search_${userId}` }],
                [{ text: 'T2T', callback_data: `ai_mode_t2t_${userId}` }]
            ]
        }
    });
});

bot.on('callback_query', (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;

    if (data.startsWith("ai_mode_search_")) {
        if (!data.endsWith(`_${userId}`)) return;
        aiSessions[userId] = { mode: "search" };
        bot.sendMessage(chatId, "💬 Silakan kirimkan pertanyaan Anda.");
    } else if (data.startsWith("ai_mode_t2t_")) {
        if (!data.endsWith(`_${userId}`)) return;
        aiSessions[userId] = { mode: "t2t" };
        bot.sendMessage(chatId, "💬 Silakan kirimkan pertanyaan Anda.");
    }
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!aiSessions[userId] || msg.text.startsWith('/')) return;

    const userInput = encodeURIComponent(msg.text);
    const mode = aiSessions[userId].mode;
    delete aiSessions[userId]; // Hapus sesi setelah digunakan

    const apiUrl = `https://fastrestapis.fasturl.cloud/aillm/superqwen?ask=${userInput}&style=Provide%20a%20detailed%20explanation&sessionId=408645&model=qwen-max-latest&mode=${mode}`;

    try {
        const response = await axios.get(apiUrl);
        if (response.data.result) {
            const cleanedText = response.data.result.replace(/\n+/g, '\n').trim();
            bot.sendMessage(chatId, cleanedText);
        } else {
            bot.sendMessage(chatId, "⚠️ Gagal mengambil hasil dari AI.");
        }
    } catch (error) {
        bot.sendMessage(chatId, "❌ Terjadi kesalahan saat mengambil data.");
    }
});

bot.onText(/\/rmbg/, async (msg) => {
    const chatId = msg.chat.id;

    // Minta URL gambar dari user
    bot.sendMessage(chatId, "🖼️ Kirimkan URL gambar yang ingin dihapus latar belakangnya (gunakan /tourl untuk mendapatkan URL gambar)\n>>>").then(() => {
        bot.once("message", async (msg) => {
            if (!msg.text || msg.text.startsWith("/")) return;
            const imageUrl = msg.text.trim();

            // Pilihan untuk menggunakan custom background atau tidak
            const options = {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "🎨 Gunakan BG Custom", callback_data: "use_bg_custom" }],
                        [{ text: "🚫 Tanpa BG", callback_data: "no_bg" }]
                    ]
                }
            };

            bot.sendMessage(chatId, "❓ Apakah ingin menggunakan background kustom?", options);

            bot.once("callback_query", async (callbackQuery) => {
                const choice = callbackQuery.data;
                bot.answerCallbackQuery(callbackQuery.id);

                let apiUrl = `https://fastrestapis.fasturl.cloud/aiimage/removebg?imageUrl=${encodeURIComponent(imageUrl)}&type=auto&shadow=false`;

                if (choice === "use_bg_custom") {
                    bot.sendMessage(chatId, "🖼️ Kirimkan URL gambar untuk background baru:").then(() => {
                        bot.once("message", async (msg) => {
                            if (!msg.text || msg.text.startsWith("/")) return;
                            const bgImageUrl = msg.text.trim();

                            apiUrl = `https://fastrestapis.fasturl.cloud/aiimage/removebg?imageUrl=${encodeURIComponent(imageUrl)}&type=auto&bgimageUrl=${encodeURIComponent(bgImageUrl)}&shadow=false`;

                            processImage(apiUrl, chatId);
                        });
                    });
                } else {
                    processImage(apiUrl, chatId);
                }
            });
        });
    });
});

// Fungsi untuk mengambil gambar dari API dan mengirim ke user
async function processImage(apiUrl, chatId) {
    bot.sendMessage(chatId, "⏳ Memproses gambar...");

    try {
        const response = await axios.get(apiUrl, { responseType: "arraybuffer" });

        if (response.status === 200) {
            const filePath = `rmbg_result.png`;
            fs.writeFileSync(filePath, response.data);

            bot.sendDocument(chatId, filePath, { caption: "✅ Background berhasil dihapus!" })
                .then(() => fs.unlinkSync(filePath)) // Hapus file setelah dikirim
                .catch(err => console.error("Error sending file:", err));
        } else {
            bot.sendMessage(chatId, "⚠️ Gagal menghapus background. Silakan coba lagi.");
        }
    } catch (error) {
        console.error("Error Remove BG:", error);
        bot.sendMessage(chatId, "❌ Terjadi kesalahan saat memproses gambar.");
    }
}

bot.onText(/^\/report$/, (msg) => {
    const chatId = msg.chat.id;
    const supportLink = "https://wa.me/62881036711862"; // Ganti dengan link support yang sesuai

    bot.sendMessage(chatId, `📢 Jika butuh bantuan, silakan kunjungi: [Klik di sini](${supportLink})`, {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
    });
});

bot.onText(/^\/senduser$/, (msg) => {
    if (!isAdmin(msg)) {
        bot.sendMessage(msg.chat.id, "❌ Anda tidak memiliki izin untuk menggunakan perintah ini.");
        return;
    }

    if (!fs.existsSync(FILE_USERS)) {
        bot.sendMessage(msg.chat.id, "❌ Data pengguna tidak ditemukan.");
        return;
    }

    const users = JSON.parse(fs.readFileSync(FILE_USERS));
    let userList = [];
    let index = 1;

    // Menampilkan user yang bukan admin tambahan & pengembang
    for (const userId in users) {
        const user = users[userId];
        if (user.role !== "Admin Tambahan" && user.role !== "Pengembang") {
            userList.push(`${index}. ID: ${userId}\n   Username: ${user.username || "(tidak ada)"}\n   Role: ${user.role}`);
            index++;
        }
    }

    if (userList.length === 0) {
        bot.sendMessage(msg.chat.id, "✅ Tidak ada pengguna yang tersedia untuk dikirimi pesan.");
        return;
    }

    bot.sendMessage(msg.chat.id, "📋 **Daftar User:**\n" + userList.join("\n\n") + "\n\n> Ketik angka urutan user yang ingin dikirimi pesan.", {
        parse_mode: "Markdown",
    });

    bot.once("message", (msg) => {
        if (!isAdmin(msg)) return;

        const choice = parseInt(msg.text);
        if (isNaN(choice) || choice < 1 || choice > userList.length) {
            bot.sendMessage(msg.chat.id, "❌ Pilihan tidak valid.");
            return;
        }

        const targetUserId = Object.keys(users).filter(uid => users[uid].role !== "Admin Tambahan" && users[uid].role !== "Pengembang")[choice - 1];

        bot.sendMessage(msg.chat.id, "✉ Silakan ketik pesan yang ingin dikirim:");
        
        bot.once("message", (msg) => {
            if (!isAdmin(msg)) return;

            bot.sendMessage(targetUserId, `/[✉️𝚙𝚎𝚜𝚊𝚗 𝚍𝚊𝚛𝚒 𝚊𝚍𝚖𝚒𝚗]/\n${msg.text}`).then(() => {
                bot.sendMessage(msg.chat.id, "✅ Pesan telah dikirim!");
            }).catch(() => {
                bot.sendMessage(msg.chat.id, "❌ Gagal mengirim pesan.");
            });
        });
    });
});

bot.onText(/^\/tourl$/, (msg) => {
    bot.sendMessage(msg.chat.id, "📷 Kirimkan gambar yang ingin diubah menjadi URL.");

    bot.once("photo", async (msg) => {
        const chatId = msg.chat.id;
        const fileId = msg.photo[msg.photo.length - 1].file_id;

        try {
            // Mengambil file path dari Telegram
            const fileUrl = await bot.getFileLink(fileId);

            bot.sendMessage(chatId, "⏳ Mengunggah gambar...");

            // Mengunggah gambar ke ImgBB
            const formData = new FormData();
            formData.append("image", fileUrl);
            formData.append("key", IMGBB_API_KEY);

            const response = await axios.post("https://api.imgbb.com/1/upload", formData, {
                headers: { ...formData.getHeaders() }
            });

            if (response.data.success) {
                const imageUrl = response.data.data.url;
                const encodedUrl = encodeURI(imageUrl); // Encode URL agar tidak ada karakter error

                bot.sendMessage(chatId, `✅ Gambar berhasil diunggah!\n🌐 URL: [Klik di sini](${encodedUrl})`, {
                    parse_mode: "Markdown",
                    disable_web_page_preview: true // Supaya link tidak ada preview
                });
            } else {
                bot.sendMessage(chatId, "❌ Gagal mengunggah gambar.");
            }
        } catch (error) {
            console.error("Error:", error);
            bot.sendMessage(chatId, "❌ Terjadi kesalahan saat mengunggah gambar.");
        }
    });
});

// Muat atau buat file jadwal
let scheduleData = { time: "07:00", caption: "Selamat pagi! 🌞", video: DEFAULT_VIDEO };
if (fs.existsSync(FILE_SCHEDULE)) {
    scheduleData = JSON.parse(fs.readFileSync(FILE_SCHEDULE));
} else {
    fs.writeFileSync(FILE_SCHEDULE, JSON.stringify(scheduleData, null, 2));
}

// Fungsi menyimpan perubahan jadwal
const saveSchedule = () => {
    fs.writeFileSync(FILE_SCHEDULE, JSON.stringify(scheduleData, null, 2));
};

// Fungsi validasi admin dari users.json
const isAdmin = (msg) => {
    if (!fs.existsSync(FILE_USERS)) return false;

    const users = JSON.parse(fs.readFileSync(FILE_USERS));
    const userData = users[msg.chat.id];

    if (!userData) return false; // Jika user tidak ada di database, tolak
    return userData.role === "Pengembang" || userData.role === "Admin Tambahan";
};

// Fungsi mengirim video ke semua user
const sendMorningVideo = () => {
    if (!fs.existsSync(scheduleData.video)) {
        bot.sendMessage("6202819748", "❌ File video tidak ditemukan!");
        return;
    }
    if (!fs.existsSync(FILE_USERS)) {
        bot.sendMessage("6202819748", "❌ Daftar user tidak ditemukan!");
        return;
    }

    const users = JSON.parse(fs.readFileSync(FILE_USERS));
    Object.keys(users).forEach((userId) => {
        bot.sendVideo(userId, scheduleData.video, { caption: scheduleData.caption }).catch((err) => {
            bot.sendMessage("6202819748", `❌ Gagal mengirim ke ${userId}: ${err.message}`);
        });
    });

    bot.sendMessage("6202819748", "✅ Video pagi telah dikirim ke semua user.");
};

// Fungsi memperbarui jadwal
const updateSchedule = () => {
    if (!scheduleData.time || !/^\d{2}:\d{2}$/.test(scheduleData.time)) {
        bot.sendMessage("6202819748", "❌ Jadwal tidak valid, menggunakan default 07:00.");
        scheduleData.time = "07:00";
    }

    const [hour, minute] = scheduleData.time.split(":");

    // Hapus jadwal lama sebelum memperbarui
    const existingJob = schedule.scheduledJobs["morningJob"];
    if (existingJob) existingJob.cancel();

    schedule.scheduleJob("morningJob", `0 ${minute} ${hour} * * *`, sendMorningVideo);
    bot.sendMessage("-1002549314973", `✅ Jadwal pengiriman video diatur pada ${scheduleData.time} WIB.`);
};

// Load dan atur jadwal saat bot dijalankan
updateSchedule();

// Perintah utama /jadwalpagi (hanya admin)
bot.onText(/^\/jadwalpagi$/, async (msg) => {
    if (!isAdmin(msg)) {
        bot.sendMessage(msg.chat.id, "❌ Anda tidak memiliki izin untuk menggunakan perintah ini.");
        return;
    }

    bot.sendMessage(msg.chat.id, "Silakan pilih opsi:", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "🕒 Ubah Jadwal", callback_data: "edit_time" }],
                [{ text: "📝 Ubah Caption", callback_data: "edit_caption" }],
                [{ text: "📹 Unggah Video", callback_data: "edit_video" }],
                [{ text: "❌ Exit", callback_data: "exit" }]
            ]
        }
    });
});

// Handle tombol inline keyboard
bot.on("callback_query", async (callbackQuery) => {
    const msg = callbackQuery.message;
    if (!isAdmin(msg)) return;

    const action = callbackQuery.data;

    if (action === "edit_time") {
        bot.sendMessage(msg.chat.id, "Masukkan jam & menit dalam format HH:MM (contoh: 07:30):");
        bot.once("message", (msg) => {
            if (!isAdmin(msg)) return;

            if (!/^\d{2}:\d{2}$/.test(msg.text)) {
                bot.sendMessage(msg.chat.id, "❌ Format tidak valid. Gunakan format HH:MM.");
                return;
            }
            scheduleData.time = msg.text;
            saveSchedule();
            updateSchedule();
            bot.sendMessage(msg.chat.id, `✅ Jadwal diperbarui ke ${msg.text} WIB.`);
        });
    } else if (action === "edit_caption") {
        bot.sendMessage(msg.chat.id, "Silakan masukkan caption baru:");
        bot.once("message", (msg) => {
            if (!isAdmin(msg)) return;

            scheduleData.caption = msg.text;
            saveSchedule();
            bot.sendMessage(msg.chat.id, "✅ Caption telah diperbarui!");
        });
    } else if (action === "edit_video") {
        bot.sendMessage(msg.chat.id, "Silakan kirim video baru untuk menggantikan video pagi.");
    }
});

// Handle video untuk mengganti video pagi (hanya admin)
bot.on("video", (msg) => {
    if (!isAdmin(msg)) return;

    bot.getFileLink(msg.video.file_id).then((fileUrl) => {
        const videoPath = path.join(__dirname, "custom_morning_video.mp4");

        axios({
            url: fileUrl,
            method: "GET",
            responseType: "stream",
        }).then((response) => {
            const writer = fs.createWriteStream(videoPath);
            response.data.pipe(writer);

            writer.on("finish", () => {
                scheduleData.video = videoPath;
                saveSchedule();
                bot.sendMessage(msg.chat.id, "✅ Video telah diperbarui!");
            });

            writer.on("error", (err) => {
                bot.sendMessage(msg.chat.id, `❌ Gagal menyimpan video: ${err.message}`);
            });
        }).catch((err) => {
            bot.sendMessage(msg.chat.id, `❌ Gagal mengunduh video: ${err.message}`);
        });
    }).catch((err) => {
        bot.sendMessage(msg.chat.id, `❌ Gagal mendapatkan file video: ${err.message}`);
    });
});

const styles = [
    { name: "Hyper-Surreal Escape", id: "hyper" },
    { name: "Neon Fauvism", id: "neon" },
    { name: "Post-Analog Glitchscape", id: "glitch" },
    { name: "AI Dystopia", id: "dystopia" },
    { name: "Vivid Pop Explosion", id: "pop" }
];

bot.onText(/^\/aiimg$/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Silakan masukkan prompt untuk gambar AI.")
        .then(() => {
            bot.once("message", async (msg) => {
                if (msg.text.startsWith("/")) return; // Abaikan jika user kirim perintah lain
                const prompt = encodeURIComponent(msg.text);

                // Menampilkan tombol pilihan style
                const keyboard = {
                    inline_keyboard: styles.map((style) => [
                        { text: style.name, callback_data: `aiimg|${style.id}|${prompt}` }
                    ])
                };

                bot.sendMessage(chatId, "Pilih style untuk gambar AI:", { reply_markup: JSON.stringify(keyboard) });
            });
        });
});

// Event handler untuk tombol pilihan style
bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (!data.startsWith("aiimg|")) return;

    const [, styleId, prompt] = data.split("|");
    const selectedStyle = styles.find((s) => s.id === styleId);

    if (!selectedStyle) {
        return bot.answerCallbackQuery(query.id, { text: "Style tidak ditemukan!" });
    }

    const apiUrl = `https://fastrestapis.fasturl.cloud/aiimage/flux/style?prompt=${prompt}&style=${encodeURIComponent(selectedStyle.name)}`;

    bot.answerCallbackQuery(query.id, { text: `Menghasilkan gambar dengan style: ${selectedStyle.name}...` });

    try {
        // Mengunduh gambar dari API
        const response = await axios.get(apiUrl, { responseType: "arraybuffer" });
        const imgPath = `ai_image_${chatId}.jpg`;

        // Simpan gambar sementara
        fs.writeFileSync(imgPath, response.data);

        // Kirim gambar ke user
        await bot.sendPhoto(chatId, fs.createReadStream(imgPath), { caption: `Style: ${selectedStyle.name}` });

        // Hapus file setelah dikirim
        fs.unlinkSync(imgPath);
    } catch (error) {
        bot.sendMessage(chatId, "Gagal mengambil gambar. Coba lagi nanti.");
        console.error("Error fetching AI image:", error);
    }
});

bot.onText(/\/register/, async (msg) => {
    const chatId = msg.chat.id;
    if (users[chatId]) {
        bot.sendMessage(chatId, "📌 Anda sudah terdaftar!");
        return;
    }

    bot.sendMessage(chatId, "📝 Silakan masukkan username yang ingin Anda gunakan:");
    bot.once("message", async (response) => {
        const username = response.text.trim();

        // Cek apakah username sudah digunakan
        if (Object.values(users).some((user) => user.username === username)) {
            bot.sendMessage(chatId, "⚠️ Username sudah dipakai, silakan pilih yang lain.");
            return;
        }

        // Simpan data user baru
        users[chatId] = {
            username,
            role: chatId == OWNER_ID ? "Pengembang" : "User",
            joinDate: new Date().toLocaleDateString(),
            messages: 0,
        };

        simpanData(); // Simpan data ke users.json

        // Kirim kata sambutan langsung tanpa gambar API dan musik
        bot.sendMessage(
            chatId,
            `✅ Pendaftaran berhasil!\n🎉 Selamat datang, *${username}*! Semoga betah di sini.`,
            { parse_mode: "Markdown" }
        );
    });
});

bot.onText(/\/profile/, async (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.username || msg.from.first_name; // Ambil username Telegram

    if (!users[chatId]) {
        return bot.sendMessage(chatId, "🔐 Anda belum terdaftar!");
    }

    const user = users[chatId];
    const profileCaption = `👤 *Profil Anda:*\n`
        + `🆔 ID: *${chatId}*\n`
        + `📛 Username: *${username}*\n`
        + `📌 Role: *${user.role}*\n`
        + `📅 Bergabung: *${user.joinDate || "Tidak diketahui"}*\n`;

    try {
        // Ambil foto profil user
        const photos = await bot.getUserProfilePhotos(chatId);
        if (!photos.total_count) {
            return bot.sendMessage(chatId, profileCaption, { parse_mode: "Markdown" });
        }

        const fileId = photos.photos[0][0].file_id;
        const file = await bot.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;

        // Download foto profil ke lokal
        const filePath = "profile.jpg";
        const response = await axios({
            url: fileUrl,
            method: "GET",
            responseType: "stream",
        });

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
        });

        // Upload ke Catbox
        const form = new FormData();
        form.append("reqtype", "fileupload");
        form.append("fileToUpload", fs.createReadStream(filePath));

        const catboxResponse = await axios.post("https://catbox.moe/user/api.php", form, {
            headers: form.getHeaders(),
        });

        const catboxUrl = catboxResponse.data.trim();

        // Hapus file lokal setelah upload
        fs.unlinkSync(filePath);

        // Buat gambar dengan API Canvas
        const apiUrl = `https://api.siputzx.my.id/api/canvas/xnxx?title=${encodeURIComponent(username)}&image=${encodeURIComponent(catboxUrl)}`;

        try {
            // Coba kirim gambar hasil API Canvas
            await bot.sendPhoto(chatId, apiUrl, {
                caption: profileCaption,
                parse_mode: "Markdown"
            });
        } catch (canvasError) {
            console.error("API Canvas error, mengirim foto profil asli:", canvasError);
            // Jika API Canvas gagal, kirim foto profil asli
            bot.sendPhoto(chatId, fileUrl, {
                caption: profileCaption,
                parse_mode: "Markdown"
            });
        }

    } catch (error) {
        console.error("Gagal mengambil atau mengunggah foto profil:", error);
        bot.sendMessage(chatId, profileCaption, { parse_mode: "Markdown" });
    }
});

// 🔹 Handle /logout
bot.onText(/\/logout/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = users[userId]?.username;

    if (!username) {
        return bot.sendMessage(chatId, "⚠️ Kamu belum terdaftar. Gunakan /register untuk mendaftar.");
    }

    delete users[userId];
    simpanData(); // Simpan data ke users.json

    // Kirim pesan perpisahan langsung tanpa gambar API
    bot.sendMessage(chatId, `👋 Selamat tinggal, *${username}*! Semoga kita bertemu lagi.`, { parse_mode: "Markdown" });
});

// 🔹 Handle /help
bot.onText(/\/help/, (msg) => {
    bot.sendMessage(msg.chat.id, `📌 *Daftar Perintah:*\n`
        + `/register - Daftar akun\n`
        + `/profile - Lihat profil\n`
        + `/logout - Keluar dari akun\n`
        + `/forum on - Masuk forum chat\n`
        + `/forum off - Keluar forum\n`
        + `/addkode - Tambah kode admin\n`
        + `/pluskode - Gunakan kode admin\n`
        + `/deladmin - Hapus admin\n`
        + `/wikipedia - search wikipedia\n`
        + `/stalker - cari informasi user\n`
        + `/nulis - menulis di canvas\n`
        + `/addmsg - menambahkan msg\n`
        + `/listmsg - melihat daftar msg\n`
        + `/delmsg - menghapus msg\n`
        + `/ngl - kirim pesan ke ngl\n`
        + `/tts - mengubah text ke audio\n`
        + `/aiimage - membuat gambar\n`
        + `/kalender - melihat kalender\n`
        + `/webrec - merekam website\n`
        + `/yts - YouTube search\n`
        + `/ai - bertanya ke ai\n`
        + `/autoai - ngobrol dengan ai\n`
        + `/shai - gemini img\n`
        + `/pin - cari gambar di pin\n`
        + `/artime - cari arti nama\n`
        + `/getpp - ambil pp user\n`
        + `/brat - buat brat\n`
        + `/igstalk - stalker instagram\n`
        + `/cuaca - cek cuaca daerah anda\n`
        + `/ttstalk - stalker tiktok\n`
        + `/dewatermark - hapus watermark`,
        { parse_mode: "Markdown" }
    );
});

// 🔹 Handle /forum (on/off)
bot.onText(/\/forum (on|off)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!users[chatId]) {
        bot.sendMessage(chatId, "🔐 Anda belum terdaftar!");
        return;
    }
    
    if (match[1] === "on") {
        forumUsers[chatId] = users[chatId].username;
        simpanData();
        bot.sendMessage(chatId, "📢 Anda masuk forum!");
    } else {
        delete forumUsers[chatId];
        simpanData();
        bot.sendMessage(chatId, "📢 Anda keluar forum.");
    }
});

// 🔹 Handle pesan di forum
bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || text.startsWith("/") || !forumUsers[chatId]) return;

    const username = users[chatId] ? users[chatId].username : "Anonim"; // Cegah error
    Object.keys(forumUsers).forEach(id => {
        if (id !== chatId.toString()) {
            bot.sendMessage(id, `💬 *${username}:* ${text}`, { parse_mode: "Markdown" });
        }
    });
});

bot.onText(/\/shai/, async (msg) => {
    const chatId = msg.chat.id;

    // Minta pertanyaan dari user
    bot.sendMessage(chatId, "✍️ Silakan masukkan pertanyaan untuk AI mengenai gambar ini:").then(() => {
        bot.once("message", async (msg) => {
            if (!msg.text || msg.text.startsWith("/")) return;
            const userQuestion = msg.text.trim();

            // Minta URL gambar dari user
            bot.sendMessage(chatId, "🖼️ Sekarang, kirimkan URL gambar yang ingin dianalisis:").then(() => {
                bot.once("message", async (msg) => {
                    if (!msg.text || msg.text.startsWith("/")) return;
                    const imageUrl = msg.text.trim();

                    bot.sendMessage(chatId, "⏳ Menganalisis gambar... Mohon tunggu.");

                    // Kirim permintaan ke API
                    try {
                        const response = await axios.post(
                            "https://fastrestapis.fasturl.cloud/aillm/gemini/image",
                            { ask: userQuestion, image: imageUrl },
                            { headers: { "Content-Type": "application/json" } }
                        );

                        if (response.data && response.data.result) {
                            const description = response.data.result.replace(/\*\*/g, ""); // Hilangkan bold **

                            // Bagi teks jika terlalu panjang (> 4000 karakter)
                            const MAX_LENGTH = 4000;
                            if (description.length > MAX_LENGTH) {
                                let parts = description.match(new RegExp(`.{1,${MAX_LENGTH}}`, "g"));
                                parts.forEach((part, index) => {
                                    setTimeout(() => {
                                        bot.sendMessage(chatId, part);
                                    }, index * 1000);
                                });
                            } else {
                                bot.sendMessage(chatId, description);
                            }
                        } else {
                            bot.sendMessage(chatId, "⚠️ Tidak ada deskripsi yang tersedia untuk gambar ini.");
                        }
                    } catch (error) {
                        console.error("Error AI response:", error);
                        bot.sendMessage(chatId, "❌ Terjadi kesalahan saat menghubungi AI.");
                    }
                });
            });
        });
    });
});

// 🔹 Handle /wikipedia
bot.onText(/\/wikipedia/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "🔍 Apa yang ingin Anda cari di Wikipedia?");
    
    bot.once("message", async (queryMsg) => {
        const query = queryMsg.text.trim();
        if (!query) {
            return bot.sendMessage(chatId, "❌ Mohon masukkan kata kunci pencarian.");
        }

        try {
            // Cari artikel di Wikipedia
            const searchUrl = `https://id.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json`;
            const searchResponse = await axios.get(searchUrl);
            const searchResults = searchResponse.data.query.search;

            if (searchResults.length === 0) {
                return bot.sendMessage(chatId, "❌ Tidak ditemukan hasil pencarian.");
            }

            // Format hasil pencarian
            let resultText = "🔍 Hasil pencarian:\n\n";
            searchResults.slice(0, 5).forEach((result, index) => {
                resultText += `${index + 1}. ${result.title}\n`;
            });

            // Kirim hasil pencarian dengan tombol pilihan
            const options = {
                reply_markup: {
                    inline_keyboard: searchResults.slice(0, 5).map((result, index) => [
                        { text: `${index + 1}`, callback_data: `wiki:${result.pageid}` }
                    ])
                }
            };

            bot.sendMessage(chatId, resultText + "\nPilih salah satu nomor untuk melihat detail:", options);
        } catch (error) {
            console.error("Gagal mencari di Wikipedia:", error);
            bot.sendMessage(chatId, "❌ Gagal melakukan pencarian. Silakan coba lagi.");
        }
    });
});

// 🔹 Handle callback query (tombol pilihan)
bot.on("callback_query", async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    // Pastikan hanya menangani callback dari Wikipedia
    if (!data.startsWith("wiki:")) return;

    const pageId = data.split(":")[1];

    try {
        // Ambil konten artikel berdasarkan pageId
        const contentUrl = `https://id.wikipedia.org/w/api.php?action=query&prop=extracts&pageids=${pageId}&explaintext=true&format=json`;
        const contentResponse = await axios.get(contentUrl);
        const page = contentResponse.data.query.pages[pageId];

        if (!page || !page.extract) {
            return bot.sendMessage(chatId, "❌ Gagal mengambil konten artikel.");
        }

        // Potong teks jika terlalu panjang
        const maxLength = 4096; // Batas maksimal pesan Telegram
        const articleText = page.extract;

        // Fungsi untuk membagi teks menjadi beberapa bagian
        const splitMessage = (text, maxLength) => {
            const parts = [];
            while (text.length > 0) {
                parts.push(text.substring(0, maxLength));
                text = text.substring(maxLength);
            }
            return parts;
        };

        // Bagi teks artikel menjadi beberapa bagian
        const messageParts = splitMessage(articleText, maxLength);

        // Kirim judul artikel
        await bot.sendMessage(chatId, `📖 *${page.title}*`, { parse_mode: "Markdown" });

        // Kirim setiap bagian pesan
        for (const part of messageParts) {
            await bot.sendMessage(chatId, part);
        }
    } catch (error) {
        console.error("Gagal mengambil konten artikel:", error);
        bot.sendMessage(chatId, "❌ Gagal mengambil konten artikel. Silakan coba lagi.");
    }
});

bot.onText(/^\/aiimgf$/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Silakan masukkan prompt untuk gambar AI.")
        .then(() => {
            bot.once("message", async (msg) => {
                if (msg.text.startsWith("/")) return; // Abaikan jika user kirim perintah lain
                const prompt = encodeURIComponent(msg.text);
                const apiUrl = `https://fastrestapis.fasturl.cloud/aiimage/nsfw?prompt=${prompt}`;

                try {
                    // Mengunduh gambar dari API
                    const response = await axios.get(apiUrl, { responseType: "arraybuffer" });
                    const imgPath = path.join(__dirname, "ai_image.jpg");

                    // Menyimpan gambar sebagai file sementara
                    fs.writeFileSync(imgPath, response.data);

                    // Mengirimkan gambar ke user
                    await bot.sendPhoto(chatId, fs.createReadStream(imgPath), { caption: "Berikut gambarnya." });

                    // Hapus file setelah dikirim
                    fs.unlinkSync(imgPath);
                } catch (error) {
                    bot.sendMessage(chatId, "Gagal mengambil gambar. Coba lagi nanti.");
                    console.error("Error fetching AI image:", error);
                }
            });
        });
});

// 🔹 Handle /nulis
bot.onText(/\/nulis/, (msg) => {
    const chatId = msg.chat.id;

    // Minta pengguna untuk mengisi nama (opsional)
    bot.sendMessage(chatId, "📝 Silakan masukkan nama Anda (opsional):");
    bot.once("message", (nameMsg) => {
        const name = nameMsg.text.trim();

        // Minta pengguna untuk mengisi kelas (opsional)
        bot.sendMessage(chatId, "📚 Silakan masukkan kelas Anda (opsional):");
        bot.once("message", (classMsg) => {
            const kelas = classMsg.text.trim();

            // Minta pengguna untuk mengisi teks (wajib)
            bot.sendMessage(chatId, "🖋 Silakan masukkan teks yang ingin ditulis:");
            bot.once("message", async (textMsg) => {
                const text = textMsg.text.trim();

                if (!text) {
                    return bot.sendMessage(chatId, "❌ Teks tidak boleh kosong. Silakan coba lagi.");
                }

                // Buat URL API dengan input pengguna
                const apiUrl = `https://api.siputzx.my.id/api/m/nulis?text=${encodeURIComponent(text)}&name=${encodeURIComponent(name)}&class=${encodeURIComponent(kelas)}`;

                try {
                    // Ambil gambar dari API
                    const response = await axios.get(apiUrl, { responseType: "arraybuffer" });

                    // Kirim gambar ke pengguna
                    await bot.sendPhoto(chatId, Buffer.from(response.data), {
                        caption: "✅ Berhasil membuat tulisan!",
                    });
                } catch (error) {
                    console.error("Gagal mengambil gambar:", error);
                    bot.sendMessage(chatId, "❌ Gagal membuat tulisan. Silakan coba lagi.");
                }
            });
        });
    });
});

// 🔹 Handle /stalker
bot.onText(/\/stalker/, (msg) => {
    const chatId = msg.chat.id;

    // Minta pengguna untuk memasukkan ID
    bot.sendMessage(chatId, "🔍 Masukkan ID pengguna yang ingin Anda stalk:");
    bot.once("message", async (idMsg) => {
        const userId = idMsg.text.trim();

        if (!userId || isNaN(userId)) {
            return bot.sendMessage(chatId, "❌ ID tidak valid. Silakan masukkan ID yang benar.");
        }

        try {
            // Dapatkan informasi pengguna dari ID
            const userInfo = await bot.getChat(userId);

            // Dapatkan foto profil pengguna
            const photos = await bot.getUserProfilePhotos(userId);

            // Format informasi pengguna
            let userDetails = `👤 *Informasi Pengguna:*\n`
                + `🆔 ID: *${userInfo.id}*\n`
                + `👀 Nama: *${userInfo.first_name} ${userInfo.last_name || ""}*\n`
                + `📛 Username: *${userInfo.username || "Tidak ada"}*\n`
                + `📝 Bio: *${userInfo.bio || "Tidak ada"}*`;

            // Jika pengguna memiliki foto profil
            if (photos.total_count > 0) {
                const fileId = photos.photos[0][0].file_id; // Ambil foto terbaru
                const photoUrl = await bot.getFileLink(fileId);

                // Kirim foto profil dan informasi pengguna
                await bot.sendPhoto(chatId, fileId, {
                    caption: userDetails,
                    parse_mode: "Markdown",
                });
            } else {
                // Kirim hanya informasi pengguna jika tidak ada foto profil
                await bot.sendMessage(chatId, userDetails, { parse_mode: "Markdown" });
            }
        } catch (error) {
            console.error("Gagal mendapatkan informasi pengguna:", error);
            bot.sendMessage(chatId, "❌ Gagal mendapatkan informasi pengguna. Pastikan ID benar dan pengguna tidak membatasi privasi mereka.");
        }
    });
});

// 🔹 Handle /addkode (Pengembang)
bot.onText(/\/addkode/, (msg) => {
    const chatId = msg.chat.id;
    if (!users[chatId] || users[chatId].role !== "Pengembang") {
        bot.sendMessage(chatId, "🚫 Hanya Pengembang yang bisa menambah admin!");
        return;
    }

    bot.sendMessage(chatId, "📝 Masukkan kode unik:")
        .then(() => {
            bot.once("message", (msg) => {
                const kode = msg.text.trim();
                adminCodes[kode] = true;
                simpanData();
                bot.sendMessage(chatId, `✅ Kode berhasil dibuat: \`${kode}\` ✅`, { parse_mode: "Markdown" });
            });
        });
});

// 🔹 Handle /pluskode (User jadi Admin)
bot.onText(/\/pluskode/, (msg) => {
    const chatId = msg.chat.id;
    if (!users[chatId]) {
        bot.sendMessage(chatId, "🔐 Anda belum terdaftar!");
        return;
    }

    bot.sendMessage(chatId, "🔑 Masukkan kode admin:")
        .then(() => {
            bot.once("message", (msg) => {
                const kode = msg.text.trim();
                if (!adminCodes[kode]) {
                    bot.sendMessage(chatId, "❌ Kode salah atau sudah digunakan!");
                    return;
                }
                delete adminCodes[kode];
                users[chatId].role = "Admin";
                simpanData();
                bot.sendMessage(chatId, "✅ Anda sekarang Admin Tambahan!");
            });
        });
});

// 🔹 Handle /deladmin (Pengembang)
bot.onText(/\/deladmin/, (msg) => {
    const chatId = msg.chat.id;
    if (!users[chatId] || users[chatId].role !== "Pengembang") {
        bot.sendMessage(chatId, "🚫 Hanya Pengembang yang bisa menghapus admin!");
        return;
    }

    const adminList = Object.entries(users).filter(([id, user]) => user.role === "Admin Tambahan");
    if (adminList.length === 0) {
        bot.sendMessage(chatId, "⚠️ Tidak ada Admin Tambahan.");
        return;
    }

    bot.sendMessage(chatId, "🗑 Masukkan username Admin yang ingin dihapus:")
        .then(() => {
            bot.once("message", (msg) => {
                const username = msg.text.trim();
                const adminId = adminList.find(([id, user]) => user.username === username)?.[0];

                if (!adminId) {
                    bot.sendMessage(chatId, "❌ Admin tidak ditemukan!");
                    return;
                }

                users[adminId].role = "User";
                simpanData();
                bot.sendMessage(chatId, `✅ Admin *${username}* dihapus!`, { parse_mode: "Markdown" });
            });
        });
});

bot.onText(/^\/tts$/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Silakan kirimkan teks yang ingin diubah menjadi suara:");

    bot.once("message", async (msg) => {
        const text = encodeURIComponent(msg.text);
        const apiUrl = `https://api.siputzx.my.id/api/tools/tts?text=${text}&voice=id-ID-ArdiNeural&rate=0%&pitch=0Hz&volume=0%`;

        try {
            const response = await axios({
                url: apiUrl,
                method: "GET",
                responseType: "arraybuffer",
            });

            const audioPath = path.join(__dirname, "tts_audio.ogg");
            fs.writeFileSync(audioPath, response.data);

            bot.sendVoice(chatId, audioPath, { caption: "🎙️ done..." })
                .then(() => fs.unlinkSync(audioPath)); // Hapus file setelah dikirim
        } catch (error) {
            console.error("Error:", error);
            bot.sendMessage(chatId, "❌ Terjadi kesalahan saat menghubungi API atau mengunduh audio.");
        }
    });
});

bot.onText(/^\/ngl/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "✉️ Silakan kirimkan link NGL Anda:");
    
    bot.once("message", (msg) => {
        const nglLink = msg.text;
        if (!nglLink.startsWith("https://")) {
            return bot.sendMessage(chatId, "Link tidak valid. Pastikan menggunakan format yang benar.");
        }

        bot.sendMessage(chatId, "Sekarang kirimkan teks yang ingin dikirim:");
        
        bot.once("message", (msg) => {
            const text = msg.text;
            const apiUrl = `https://api.siputzx.my.id/api/tools/ngl?link=${encodeURIComponent(nglLink)}&text=${encodeURIComponent(text)}`;

            fetch(apiUrl)
                .then(response => response.json())
                .then(data => {
                    if (data.status && data.data && data.data.questionId) {
                        bot.sendMessage(chatId, `✅ Pesan berhasil dikirim!\n\n📌 Question ID: \`${data.data.questionId}\``, { parse_mode: "Markdown" });
                    } else {
                        bot.sendMessage(chatId, "❌ Gagal mengirim pesan ke NGL.");
                    }
                })
                .catch(error => {
                    console.error("Error:", error);
                    bot.sendMessage(chatId, "❌ Terjadi kesalahan saat menghubungi API.");
                });
        });
    });
});

// 🔹 Handle /addmsg
bot.onText(/\/addmsg/, (msg) => {
    const chatId = msg.chat.id;

    // Minta pengguna untuk memasukkan judul pesan
    bot.sendMessage(chatId, "📝 Masukkan judul pesan yang ingin Anda simpan:");
    bot.once("message", (titleMsg) => {
        const title = titleMsg.text.trim();

        if (!title) {
            return bot.sendMessage(chatId, "❌ Judul tidak boleh kosong. Silakan coba lagi.");
        }

        // Minta pengguna untuk mengirimkan pesan yang ingin disimpan
        bot.sendMessage(chatId, "📤 Silakan kirim pesan (text, file, audio, foto, video) yang ingin Anda simpan:");
        bot.once("message", (contentMsg) => {
            const content = {
                type: contentMsg.photo ? "photo" :
                      contentMsg.video ? "video" :
                      contentMsg.audio ? "audio" :
                      contentMsg.document ? "file" :
                      "text",
                data: contentMsg.text || contentMsg.photo || contentMsg.video || contentMsg.audio || contentMsg.document
            };

            // Simpan pesan ke database
            if (!userMessages[chatId]) {
                userMessages[chatId] = {};
            }
            userMessages[chatId][title] = content;

            // Simpan database ke file
            fs.writeFileSync("userMessages.json", JSON.stringify(userMessages, null, 2));

            bot.sendMessage(chatId, `✅ Pesan dengan judul *${title}* berhasil disimpan!`, { parse_mode: "Markdown" });
        });
    });
});

// 🔹 Handle /listmsg
bot.onText(/\/listmsg/, (msg) => {
    const chatId = msg.chat.id;

    // Minta pengguna untuk memasukkan ID mereka
    bot.sendMessage(chatId, "🔐 Masukkan ID Anda untuk melihat pesan yang tersimpan jika tidak tahu ID anda anda bisa mengunjungi '@userinfobot':");
    bot.once("message", (idMsg) => {
        const userId = idMsg.text.trim();

        if (!userMessages[userId]) {
            return bot.sendMessage(chatId, "❌ Tidak ada pesan yang tersimpan untuk ID ini.");
        }

        // Tampilkan daftar pesan yang tersimpan
        const messages = Object.keys(userMessages[userId]);
        let messageList = "📂 Daftar pesan Anda:\n\n";
        messages.forEach((title, index) => {
            messageList += `${index + 1}. ${title}\n`;
        });

        // Kirim daftar pesan
        bot.sendMessage(chatId, messageList + "\nPilih nomor pesan untuk melihat isinya:", {
            reply_markup: {
                inline_keyboard: messages.map((title, index) => [
                    { text: `${index + 1}`, callback_data: `viewmsg_${userId}_${title}` }
                ])
            }
        });
    });
});

// 🔹 Handle callback query untuk melihat pesan
bot.on("callback_query", async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const [action, userId, title] = callbackQuery.data.split("_");

    if (action === "viewmsg") {
        const message = userMessages[userId][title];

        if (!message) {
            return bot.sendMessage(chatId, "❌ Pesan tidak ditemukan.");
        }

        // Kirim pesan sesuai jenisnya
        switch (message.type) {
            case "text":
                bot.sendMessage(chatId, `📝 *${title}*\n\n${message.data}`, { parse_mode: "Markdown" });
                break;
            case "photo":
                bot.sendPhoto(chatId, message.data[0].file_id, { caption: `📷 *${title}*`, parse_mode: "Markdown" });
                break;
            case "video":
                bot.sendVideo(chatId, message.data.file_id, { caption: `🎥 *${title}*`, parse_mode: "Markdown" });
                break;
            case "audio":
                bot.sendAudio(chatId, message.data.file_id, { caption: `🎵 *${title}*`, parse_mode: "Markdown" });
                break;
            case "file":
                bot.sendDocument(chatId, message.data.file_id, { caption: `📄 *${title}*`, parse_mode: "Markdown" });
                break;
            default:
                bot.sendMessage(chatId, "❌ Jenis pesan tidak dikenali.");
        }
    }
});

// 🔹 Handle /delmsg
bot.onText(/\/delmsg/, (msg) => {
    const chatId = msg.chat.id;

    // Minta pengguna untuk memasukkan ID mereka
    bot.sendMessage(chatId, "🔐 Masukkan ID Anda untuk menghapus pesan yang tersimpan:");
    bot.once("message", (idMsg) => {
        const userId = idMsg.text.trim();

        if (!userMessages[userId]) {
            return bot.sendMessage(chatId, "❌ Tidak ada pesan yang tersimpan untuk ID ini.");
        }

        // Tampilkan daftar pesan yang tersimpan
        const messages = Object.keys(userMessages[userId]);
        let messageList = "📂 Daftar pesan Anda:\n\n";
        messages.forEach((title, index) => {
            messageList += `${index + 1}. ${title}\n`;
        });

        // Kirim daftar pesan dengan tombol untuk menghapus
        bot.sendMessage(chatId, messageList + "\nPilih nomor pesan untuk menghapus:", {
            reply_markup: {
                inline_keyboard: messages.map((title, index) => [
                    { text: `${index + 1}`, callback_data: `delmsg_${userId}_${title}` }
                ])
            }
        });
    });
});

// 🔹 Handle callback query untuk menghapus pesan
bot.on("callback_query", async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const [action, userId, title] = callbackQuery.data.split("_");

    if (action === "delmsg") {
        if (!userMessages[userId] || !userMessages[userId][title]) {
            return bot.sendMessage(chatId, "❌ Pesan tidak ditemukan.");
        }

        // Hapus pesan dari database
        delete userMessages[userId][title];

        // Jika tidak ada pesan tersisa, hapus entri pengguna
        if (Object.keys(userMessages[userId]).length === 0) {
            delete userMessages[userId];
        }

        // Simpan database ke file
        fs.writeFileSync("userMessages.json", JSON.stringify(userMessages, null, 2));

        bot.sendMessage(chatId, `✅ Pesan dengan judul *${title}* berhasil dihapus!`, { parse_mode: "Markdown" });
    }
});

// Load database
if (fs.existsSync("userMessages.json")) {
    const data = fs.readFileSync("userMessages.json");
    Object.assign(userMessages, JSON.parse(data));
}
