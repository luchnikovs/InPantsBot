
/* In Pants bot */

const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const cloudinary = require('cloudinary');

/* Authentication data */
let auth = JSON.parse(fs.readFileSync('src/auth.json', 'utf8'));

/* JSON data */
let dictionary = JSON.parse(fs.readFileSync('src/db/dictionary.json', 'utf8'));
let users = JSON.parse(fs.readFileSync('src/db/users.json', 'utf8'));

/* Telegram auth */
let telegramToken = auth.telegramToken;

/* Cloudinary auth */
let cloudinaryCloudName = auth.cloudinaryCloudName;
let cloudinaryApiKey = auth.cloudinaryApiKey;
let cloudinaryApiSecret = auth.cloudinaryApiSecret;


/* API init */
let bot = new TelegramBot(telegramToken, {polling: true});
cloudinary.config({ cloud_name: cloudinaryCloudName, api_key: cloudinaryApiKey, api_secret: cloudinaryApiSecret });

/* Globals */

// Список пользователей, от которых бот ожидает ответа
let sessions = {
    addToPants: [],
    removeFromPants: []
};


  /* Controller */

    bot.on('message', function (msg) {
        console.log(msg);

        let chatId = msg.chat.id;
        let userId = msg.from.id;

        switch (getMsgType(msg)) {
            case 'text':
                if (sessions.addToPants.indexOf(userId) > -1) {
                    addToPants(chatId, msg.text);
                    removeUserFromSession('addToPants', userId);
                } else if (sessions.removeFromPants.indexOf(userId) > -1) {
                    removeFromPants(chatId, msg.text);
                    removeUserFromSession('removeFromPants', userId);
                } else {
                    getPantsMessage(chatId, msg.text);
                }
                break;
            case 'bot_command':
                applyBotCommand(chatId, userId, users[userId], msg.text);
                break;
            case 'image_url':
                sendOverlayImage(chatId, msg.text);
                break;
            case 'photo':
                console.log('Photo');
                break;
            case 'video':
                console.log('Video');
        }
    });


  /* Bot methods */

    /** Выполняет команды бота
     *  @param {number} [chatId] - id чата
     *  @param {number} [userId] - id пользователя
     *  @param {string} [userName] - имя пользователя
     *  @param {string} [msgText] - текст сообщения
     */
    function applyBotCommand(chatId, userId, userName, msgText) {

        let currentCommand = '';
        let _userName = userName || 'человек';

        switch(msgText) {
            case '/help':
                bot.sendMessage(chatId, 'Чиво тибе от меня надо бляяять?');
                break;
            case '/settings':
                bot.sendMessage(chatId, 'Нету настроеееек');
                break;
            case '/getdictionary':
                bot.sendMessage(chatId, 'Сейчас в штанах: ' + dictionary.join(', '));
                break;
            case '/addtopants':
            case '/addtopants@inpants_bot':
                bot.sendMessage(chatId, `Что добавить в штаны, ${_userName}?`);
                currentCommand = 'addToPants';
                break;
            case '/removefrompants':
            case '/removefrompants@inpants_bot':
                bot.sendMessage(chatId, `Что удалить в штанов, ${_userName}?`);
                currentCommand = 'removeFromPants';
                break;
            default:
        }

        addUserToSession(currentCommand, userId);
    }

    /** Добавляет слово в штаны
     *  @param {number} [chatId] - id чата
     *  @param {string} [msgText] - текст сообщения
     */
    function addToPants(chatId, msgText) {

        let text = msgText.toLowerCase();

        if( text.split(' ').length > 1 ) {
            bot.sendMessage(chatId, `Одно слово, блеадь!`);
            return;
        } else if (text.replace(/[аА-яЯ]/g, '').length > 0) {
            bot.sendMessage(chatId, `Не нужно мне в штанах такого, спасибо.`);
            return;
        } else if (dictionary.indexOf(text) != -1) {
            bot.sendMessage(chatId, `"${text}" уже есть в штанах.`);
            return;
        }

        dictionary.push(text);
        fs.writeFileSync('dictionary.json', JSON.stringify(dictionary));

        bot.sendMessage(chatId, `"${text}" добавлено в штаны`);
    }

    /** Удаляет слово из штанов
     *  @param {number} [chatId] - id чата
     *  @param {string} [msgText] - текст сообщения
     */
    function removeFromPants(chatId, msgText) {

        let text = msgText.toLowerCase();

        if (text.split(' ').length > 1) {
            bot.sendMessage(chatId, `Одно слово, блеадь!`);
            return;
        } else if (text.replace(/[аА-яЯ]/g, '').length > 0) {
            bot.sendMessage(chatId, `В моих штанах не может быть такой херни. У себя посмотри.`);
            return;
        } else if (dictionary.indexOf(text) == -1) {
            bot.sendMessage(chatId, `Нет такого.`);
            return;
        }

        dictionary.splice(dictionary.indexOf(text), 1);
        fs.writeFileSync('dictionary.json', JSON.stringify(dictionary));

        bot.sendMessage(chatId, `"${text}" удалено из штанов`);
    }

    /** Отправляет в чат изображение с наложением
     *  @param {number} [chatId] - id чата
     *  @param {string} [link] - ссылка на изображение
     */
    function sendOverlayImage(chatId, link) {
        cloudinary.uploader.upload(link, function(result) {

            // troll_face - public id изображения в библиотеке файлов Cloudinary (имя файла без расширения)
            let imageOverlay = cloudinary.url(result.public_id, {overlay: "troll_face"});

            bot.sendMessage(chatId, imageOverlay);
            setTimeout(() => {
                bot.sendSticker(chatId, 'BQADBQAD_gAD6QrIA1wTp4xnPqetAg');
            }, 4000)
        });
    }

    /** Возвращает слово из штанов при его наличии
     *  @param {number} [chatId] - id чата
     *  @param {string} [msgText] - текст сообщения
     */
    function getPantsMessage(chatId, msgText) {

        let results = [];
        let text = msgText.toLowerCase().split(' ');

        /* поиск в сообщении слов из dictionary */
        dictionary.forEach((val) => {
            if (text.indexOf(val) > -1) {
                results.push(val);
            }
        });

        results = results.join(' и ');

        if (text.indexOf('курва') > -1) {
            bot.sendSticker(chatId, 'BQADAgADxwEAAoHorgPpCS3eNE-L8gI');
        }
        if (results) {
            bot.sendMessage(chatId, `В штанах у меня ${results}, а это таааак себе`);
        }
    }


  /* Helpers */

    /** Возвращает тип сообщения
     *  @param {object} [msg] - сообщение
     *  @return {string}
     */
    function getMsgType(msg) {

        const types = ['text', 'sticker', 'photo', 'video', 'audio', 'location', 'document'];
        let currentType = '', resultType = '';

        // Быстрая проверка на стандартные типы telegram
        for (var i = 0; i < types.length; i++) {
            if (msg.hasOwnProperty(types[i])) {
                currentType = types[i];
                break;
            }
        }

        // Парсинг текста и выявление типа ссылки, если она в нем есть
        // TODO: пока тип ссылки только один - image_url. Надо будет добавить другие форматы
        if (currentType == 'text') {
            let text = msg.text;

            if (text.indexOf('http') > -1 && text.indexOf('.jpg') > -1 || text.indexOf('.png') > -1) {
                resultType = 'image_url';
            } else if (text[0] == '/') {
                resultType = 'bot_command'
            } else {
                resultType = 'text';
            }
        } else {
            resultType = currentType;
        }

        return resultType;
    }

    /** Добавляет в список ожидания команды пользователя, от которого бот ожидает действий
     *  @param {string} [command] - команда бота
     *  @param {number} [userId] - ID пользователя
     */
    function addUserToSession(command, userId) {
        sessions[command].push(userId);
    }

    /** Удаляет из списка ожидания команды пользователя, от которого бот ожидает действий
     *  @param {string} [command] - команда бота
     *  @param {number} [userId] - ID пользователя
     */
    function removeUserFromSession(command, userId) {
        sessions[command].splice(sessions[command].indexOf(userId), 1);
    }