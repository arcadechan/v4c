// ==UserScript==
// @name         Arcade's Ban All Graynames button
// @namespace    cytube
// @version      0.1
// @description  Adds a button and custom $arcade command to ban all graynames (for raids).
// @author       ArcadeChan
// @include https://cytu.be/r/*
// @include https://www.cytu.be/r/*
// @grant        none
// @run-at document-end
// ==/UserScript==

(function () {
    "use strict";

    $(document).ready(function () {
      //V4C elements take some time to load so hold off creating custom elements until all sections are found.
      const findUserList = setInterval(function () {
        const userList = $("#userlist");
        const toggleVideoList = $("#toggleVideoList");


        if (userList.length && toggleVideoList.length) {
          clearInterval(findUserList);
          createBanGraynamesButton(toggleVideoList);
        }
      }, 100);

      const detectSocketAPI = setInterval(function(){
          if(typeof socket.on !== 'undefined' && typeof window.userlist() !== 'undefined'){
              clearInterval(detectSocketAPI);
              startChatTracking();
          }
      }, 100);

      //Optional feature. Adds a button next to the Self Clear button to hide/show the Video Playlist
      function createBanGraynamesButton(toggleVideoList) {
        const banGraynamesButton = `
                  <button title="banGraynames" id="banGraynames" class="btn btn-default btn-sm btn-danger">Ban Graynames</button>
              `;

        toggleVideoList.after(banGraynamesButton);
        $("#banGraynames").on("click", banGraynames);
      }

      function banGraynames() {
        const userlist = document.querySelector("#userlist");
        const users = userlist.children;

        let theGrays = [];

        for (let i = 0; i < users.length; i++) {
          const gray = users[i].querySelector('span[class^="userlist_guest"]');

          // console.log({gray});
          if (gray !== null) {
            theGrays.push(gray.textContent);
          }
        }

        if (theGrays.length > 0) {
          let banCounter = 0;

          const banEm = setInterval(function () {
            if (banCounter == theGrays.length - 1) clearInterval(banEm);

            let grayname = theGrays[banCounter];

            socket.emit('chatMsg', { msg: '/ipban ' + grayname });

            banCounter++;
          }, 200);
        } else {
          socket.emit('chatMsg', { msg: 'Did not detect any graynames.' })
        }
      }

      function startChatTracking(){
          socket.on('chatMsg', (event) => {

            const message = stripHTML(event.msg);

              if(message.startsWith('$arcade')){
                  //ban grays - mod only
                  if(message == '$arcade bangrays'){
                      const username = event.username;
                      const user = window.userlist()[username]

                      if(user !== undefined && user.rank >= 2){
                          banGraynames();
                      }
                  }
              }
          });
      }

      function stripHTML(html){
          let temp = document.createElement('div');
          temp.innerHTML = html;
          return temp.textContent.trim() || temp.innerText.trim() || "";
      }

    });
  })();
