// ==UserScript==
// @name         Arcade's v4c script
// @namespace    cytube
// @version      0.3
// @description  Adds various features and styling changes.
// @author       ArcadeChan
// @include https://cytu.be/r/*
// @include https://www.cytu.be/r/*
// @grant        none
// @run-at document-end
// ==/UserScript==


(function() {
    "use strict";

    $(document).ready(function(){
        createBumpSoundElement();

        //V4C elements take some time to load so hold off creating custom elements until all sections are found.
        const findFirst = setInterval(function(){
            const optionsBtn = $('div.ChatOptions.dropdown');
            const chat = $('#chatwrap');
            const showRecentBtn = $('#rightcontrols #plcontrol #showrecent');

            if(optionsBtn.length && chat.length && showRecentBtn.length){
                clearInterval(findFirst);
                createToggleChatBtn(optionsBtn, chat);
                createChatEventsTracking(showRecentBtn, chat);
            }
        }, 100);

        const findTopBar = setInterval(function(){
            const topBar = $('nav.navbar');

            if(topBar.length){
                clearInterval(findTopBar);
                createTopBarToggle(topBar);
            }
        }, 100);

        const findVideoList = setInterval(function(){
            const videoList = $('.videolist#queue');
            const selfClear = $('#selfClearbtn.btn');

            if(videoList.length && selfClear.length){
                clearInterval(findVideoList);
                createToggleVideoListBtn(selfClear ,videoList);
            }
        }, 100);

        // const findVideoMeta = setInterval(function(){
        //     const videoMeta = $('#videowrap-header');

        //     if(videoMeta.length){
        //         videoPlayerEvents(videoMeta);
        //     }
        // }, 100);

        // create style tag
        //var style = document.createElement('style');
        // style.type = 'text/css';

        const styleText = `
            /* NON ESSENTIAL CSS START - CAN BE REMOVED */
                body,
                #messagebuffer {
                    background-color: #131313 !important;
                }

                #chatwrap .linewrap .username,
                #userlist .userlist_item span[class^="userlist-"] {
                    color: #d0a035;
                }

                #chatwrap #chatbtn {
                    display: none !important;
                }

                #messagebuffer,
                #chatinput #chatline {
                    border: none !important;
                }

                #chatinput #chatline {
                    background-color: #1f1e1e !important;;
                }

                /*Hid these elements before realizing most of them can be hidden natively within existing hide options*/
                /*#plcontrol #showsearch,
                #plcontrol #showplaylistmanager,
                #plcontrol #showuserfilter,
                #videocontrols #volumeButtonDown,
                #videocontrols #volumeButtonIndicator,
                #videocontrols #volumeButtonUp,
                #videocontrols #quickQuality,
                #videocontrols #mediarefresh,
                #videocontrols #fullscreenbtn,
                #leftcontrols button[title="Toggle Cinema Mode"] {
                    display: none !important;
                }*/

                ::-webkit-scrollbar {
                    width: 6px !important;
                    background: #000000 !important;
                }

                ::-webkit-scrollbar-thumb {
                    background-color: #1f1e1e !important;
                }

                #topBarToggle {
                    float: right;
                    margin-bottom: 1rem;
                    margin-right: 1rem;
                }

                #topBarToggle.top-bar-toggled {
                    margin-top: 1rem;
                }

            /* NON ESSENTIAL CSS END */

            #cd-tracker {
                display: flex;
                font-size: 12px;
            }

            #cd-tracker p.tracker-text {
                display: inline;
            }

            #cd-tracker .tracker-container {
                display: none;
                padding: 3.5px 8px;
                border: 1px solid #424242;
            }

            .toggle-btn.toggled{
                background-color: #882a2a;
            }

            .toggle-btn .toggle-btn-checkbox {
                pointer-events: none;
                margin: 0 !important;
                height: 10px;
            }

            .toggled-tracker {
                display: inline-block !important;
            }

            .userBumpAlert {
                background-color: rgba(145, 45, 225, 0.5);
            }

            .bump-link {
                display: block;
            }
        `;

        let styleTag = $('<style></style>');
        styleTag.attr('type', 'text/css').text(styleText).appendTo('head');


        //Optional feature. Adds a button next to the existing blue chat options button to hide/show chat.
        function createToggleChatBtn(optionsBtn, chat){

            const userlist = chat.find('#userlist');
            const chatBox = chat.find('.linewrap#messagebuffer');
            const chatInput = chat.find('#chatinput');

            const toggleChatBtn = `
                <div class="toggleChat pull-right">
                    <button class="btn btn-primary" type="button" style="padding: 2px 5px;font-size: 11px; height: 20px; display: block">
                        &nbsp;
                        Toggle Chat
                        &nbsp;
                    </button>
                </div>
            `;

            if(chat.length){
                optionsBtn.before(toggleChatBtn);

                $('.toggleChat').on('click', { chatInput, chatBox, userlist }, toggleChat);
            }
        }

        //Optional feature. Adds a button next to the Self Clear button to hide/show the Video Playlist
        function createToggleVideoListBtn(selfClear, videoList){
            let videoMeta = $('#plmeta');

            const toggleVideoListBtn = `
                <button title="toggleVideoList" id="toggleVideoList" class="btn btn-default btn-sm">Toggle Video List</button>
            `;

            if(videoList.length){
                selfClear.after(toggleVideoListBtn);

                $('#toggleVideoList').on('click', {videoList, videoMeta}, toggleVideoList);
            }
        }

        //Listens for new lines in chat in order to fire various events.
        function createChatEventsTracking(showRecentBtn, chat){
            const username = window.CLIENT.name; //Gets your username
            const chatMsgClass = 'chat-msg-' + username;
            const bumpNotification = document.querySelector('#AudioNoticeUserBumpRequest');
            const chatBox = $( '.linewrap#messagebuffer' );
            const showTimestamps = window.USEROPTS.show_timestamps;

            const bumpRegexPattern = /bump/g;

            /**
             * Create chatbot command realtime countdown trackers.
             * Currently all tracking is lost if you refresh.
             * Ultimately will be based on storing a timestamp in browser session and checking for session trackers on load and calculating elapsed time...
             */
            var trackerElement = document.createElement('div')
            trackerElement.setAttribute('id', 'cd-tracker');
            trackerElement.innerHTML = `
                <div id="quote-tracker" class="tracker-container">
                    <p class="tracker-text">$quote CD: <span class="seconds">0</span></p>
                </div>
                <div id="comment-tracker" class="tracker-container">
                    <p class="tracker-text">$comment CD: <span class="seconds">0</span></p>
                </div>
                <div id="wolfram-tracker" class="tracker-container">
                    <p class="tracker-text">$wolfram CD: <span class="seconds">0</span></p>
                </div>
                <div id="pokeroll-tracker" class="tracker-container">
                    <p class="tracker-text">$pokeroll CD: <span class="seconds">0</span></p>
                </div>
                <div id="anagram-tracker" class="tracker-container">
                    <p class="tracker-text">$anagram CD: <span class="seconds">0</span></p>
                </div>
                <div id="img-tracker" class="tracker-container">
                    <p class="tracker-text">$img CD: <span class="seconds">0</span></p>
                </div>
                <div id="roll-tracker" class="tracker-container">
                    <p class="tracker-text">$roll CD: <span class="seconds">0</span></p>
                </div>
            `;

            //Insert realtime countdown trackers after the "Show Recently Played" button.
            let parentElement = document.querySelector('#rightcontrols #plcontrol');
            parentElement.appendChild(trackerElement);

            let commands = {
                '$quote': {
                    parentElement: $('#quote-tracker'),
                    secondsElement: $('#quote-tracker .tracker-text .seconds'),
                    counterName: 'quoteCounter',
                    timeout: 90,
                    cdRunning: false
                },
                '$comment': {
                    parentElement: $('#comment-tracker'),
                    secondsElement: $('#comment-tracker .tracker-text .seconds'),
                    counterName: 'commentCounter',
                    timeout: 4,
                    cdRunning: false
                },
                '$wolfram': {
                    parentElement: $('#wolfram-tracker'),
                    secondsElement: $('#wolfram-tracker .tracker-text .seconds'),
                    counterName: 'wolframCounter',
                    timeout: 30,
                    cdRunning: false
                },
                '$pokeroll': {
                    parentElement: $('#pokeroll-tracker'),
                    secondsElement: $('#pokeroll-tracker .tracker-text .seconds'),
                    counterName: 'pokerollCounter',
                    timeout: 540,
                    cdRunning: false
                },
                '$anagram': {
                    parentElement: $('#anagram-tracker'),
                    secondsElement: $('#anagram-tracker .tracker-text .seconds'),
                    counterName: 'anagramCounter',
                    timeout: 30,
                    cdRunning: false
                },
                '$img': {
                    parentElement: $('#img-tracker'),
                    secondsElement: $('#img-tracker .tracker-text .seconds'),
                    counterName: 'imgCounter',
                    timeout: 90,
                    cdRunning: false
                },
                '$roll': {
                    parentElement: $('#roll-tracker'),
                    secondsElement: $('#roll-tracker .tracker-text .seconds'),
                    counterName: 'rollCounter',
                    timeout: 140,
                    cdRunning: false
                }
            };

            $(chatBox).on('DOMNodeInserted', { commands, chatMsgClass, bumpNotification, showTimestamps, username, bumpRegexPattern }, trackChat);
        }

        function getMessage(messageContainer, showTimestamps){
            let messageText = '';

            if(messageContainer.hasClass('consecutive')){
                messageText = showTimestamps ? messageContainer.children().eq(1).text() : messageContainer.children().eq(0).text();
            } else {
                messageText = showTimestamps ? messageContainer.children().eq(2).text() : messageContainer.children().eq(1).text();
            }

            return messageText;
        }

        //Create an easier to use toggle than the nested option inside OPTIONS
        function createTopBarToggle(topBar){
            let toggleButton = document.createElement('button');
            toggleButton.setAttribute('id', 'topBarToggle');
            toggleButton.classList.add(...['btn', 'btn-sm', 'btn-default'])
            toggleButton.innerHTML = `
                <span id="topBarStatus">Hide</span> Top Bar
            `;

            topBar.after(toggleButton);

            let topBarStatus = toggleButton.querySelector('#topBarStatus');

            $('#topBarToggle').on('click', { topBar, topBarStatus} , toggleTopBar);
        }

        //creates an audio element to trigger when bump keywords are detected in chat
        function createBumpSoundElement(){
            let audioElement = document.createElement('audio');
            audioElement.setAttribute('id', 'AudioNoticeUserBumpRequest');
            audioElement.setAttribute('preload', 'auto');
            audioElement.innerHTML = `
                <source src="https://www.myinstants.com/media/sounds/codec.mp3" type="audio/ogg">
            `;

            document.body.appendChild(audioElement);
        }

        //HELPER FUNCTIONS

        //Toggle Chat
        function toggleChat(event){
            event.data.chatInput.toggle();
            event.data.chatBox.toggle();
            if(event.data.chatBox.is(':visible')){
                event.data.userlist.show();
            } else {
                event.data.userlist.hide();
            }
        }

        //Toggle Video List
        function toggleVideoList(event) {
            event.data.videoList.toggle();
            event.data.videoMeta.toggle();
        }

        //Toggle Topbar
        function toggleTopBar(event){
            $(this).toggleClass('top-bar-toggled');

            if($(this).hasClass('top-bar-toggled')){
                event.data.topBar.hide();
                event.data.topBarStatus.textContent = 'Show';
            } else {
                event.data.topBar.show();
                event.data.topBarStatus.textContent = 'Hide';
            }
        }

        //Track Chat
        function trackChat(event){
            let commands = event.data.commands;
            let chatMsgClass = event.data.chatMsgClass;
            let bumpNotification = event.data.bumpNotification;
            let showTimestamps = event.data.showTimestamps;
            let username = event.data.username;
            let bumpRegexPattern = event.data.bumpRegexPattern;

            let messageContainer = $(this).children().last();
            let messageText = '';

            //CHAT COMMAND TRACKER
            if(messageContainer.hasClass(chatMsgClass)){
                //let showTimestamps = messageContainer.find('.timestamp').length;

                messageText = getMessage(messageContainer, showTimestamps);

                let command = messageText.split(' ')[0];

                console.log({messageText, command, commands});

                if(commands[command] !== undefined && !commands[command].cdRunning) {
                    console.log(command + 'command detected. setting time out to : ' + commands[command].timeout);
                    commands[command].secondsElement.text( commands[command].timeout );
                    commands[command].parentElement.toggleClass('toggled-tracker');
                    console.log({'secondsElement': commands[command].secondsElement, 'parentElement': commands[command].parentElement});
                    commands[command].cdRunning = true;
                    let counter = commands[command].timeout;
                    console.log({counter});

                    window[commands[command]['counterName']] = setInterval(function(){
                        console.log(window[commands[command]['counterName']]);
                        counter--;
                        commands[command].secondsElement.text( counter );
                        if(counter == 0 || counter < 0){
                            clearInterval(window[commands[command]['counterName']]);
                            commands[command].parentElement.toggleClass('toggled-tracker');
                            commands[command].cdRunning = false;
                            commands[command].secondsElement.text(0);
                        }
                    }, 1000);

                    // localStorage.setItem((command + '_cd_start'), Date.now());
                    // localStorage.setItem((command + '_cd_end'), (Date.now() + (commands[command].timeout) * 1000));
                }
            }

            //Bump Alerterino
            if (
                !messageContainer.hasClass('chat-msg-vidyabot') &&
                !messageContainer.hasClass(('chat-msg-' + username)) &&
                !messageContainer.hasClass('chat-msg-\\$server\\$') &&
                !messageContainer.hasClass('chat-msg-vidyabot') &&
                !messageContainer.children().eq(0).hasClass('userlist_op')
            ) {
                let emoteName = messageContainer.find('.channel-emote').attr('title');
                let bumpFound = false;

                //let user = messageContainer.find('.user-link').text();
                const classList = messageContainer.attr('class').split(' ');
                const userClass = classList.find( c => c.includes('chat-msg-') );
                const user = userClass.split('-')[2];

                //console.log({classList, userClass, user});

                messageText = getMessage(messageContainer, showTimestamps);

                //console.log(messageText);

                bumpFound = messageText.split(' ').some( word => word.match( bumpRegexPattern ) );

                if(emoteName !== undefined && ['$bump', '/#bump'].includes(emoteName)){
                    bumpFound = true;
                }

                //console.log(bumpFound);

                if(bumpFound){
                    let videos = document.querySelectorAll('.qe_blame');

                    for(let i = (videos.length - 1); i >= 0; i--){
                        let video = videos[i];

                        if(video.textContent.split(' ')[0] == user){
                            let link = video.parentElement.querySelector('.qe_title');
                            let duration = video.parentElement.querySelector('.qe_time').textContent;
                            let videoTitle = link.textContent;

                            let updatedText = `
                                ${videoTitle} | ${duration}
                            `;

                            let clone = $(link).clone();
                            clone.removeClass('qe_title').text(updatedText.trim()).insertAfter(messageContainer);
                            break;
                        }
                    }

                    messageContainer.addClass('userBumpAlert');
                    bumpNotification.play();
                }
            }
        }
    });

})();