function goBack(){
    Android.loadWebPage("file:///android_asset/web/tremola.html")
}

function addLobbyButton() {
     document.getElementById('popupCreateLobby:div').style.display = 'block';
     fill_members("popupCreateLobby:divMembers");
}
function popupCreateLobby_close(event) {
    if (event.target == document.getElementById('popupCreateLobby:div')) {
        document.getElementById('popupCreateLobby:div').style.display = 'none';
    }
}
function showHangmanLobby(){
    Android.loadWebPage("file:///android_asset/web/hangGame/lobby.html")
}
function popupCreateLobby_confirmButton(){
    document.getElementById('popupCreateLobby:div').style.display = 'initial';
    var lobbyName = document.getElementById('popupCreateLobbyName:text').value;
    var hangmanWord = document.getElementById('popupCreateLobbyWord:text').value;
    document.getElementById('popupCreateLobby:div').style.display = 'none';
    createHGMLobby(lobbyName,hangmanWord);
    //backend(encodeBackend("CreateLobby", [lobbyName,gameWord]));
}
function newLobbyConfirmed(lobbyName,gameWord){
    backend(encodeBackend("CreateLobby", [lobbyName,gameWord]));
}
function encodeBackend(operation, args){
    var encodedArgs = args.length > 1 ? btoa(args.slice(0).map(unicodeStringToTypedArray).map(btoa)) : "null";
    var backendMessage = [operation,encodedArgs].join(" ");
    return backendMessage;
}
function lobbyMenu_showInvitations(){
    document.getElementById("lobbyMenu_contentDiv").style.display = "none";
    document.getElementById('popupLobbyInvitations:div').style.display = 'block';
}
function popupInvitations_close(event) {
    // Check if the click event occurred on the overlay (i.e., the popup itself)
    if (event.target == document.getElementById('popupLobbyInvitations:div')) {
        document.getElementById('popupLobbyInvitations:div').style.display = 'none';
    }
}
function lobbyMenu_button() {
    var contentDiv = document.getElementById("lobbyMenu_contentDiv");
    if (contentDiv.style.display === "block") {
        contentDiv.style.display = "none";
    } else {
        contentDiv.style.display = "block";
    }
}

function lobbyCreateInvitation(hgm_lobby_id) {

    var hangmanLobby = tremola.hangman[hgm_lobby_id]

    if (document.getElementById("popupLobbyInvitation:" + hgm_lobby_id)) {
        if (hangmanLobby.subscribed || !(myId in hangmanLobby.pendingInvitations))
            document.getElementById("popupLobbyInvitation:" + hgm_lobby_id).outerHTML = ""
        else
            document.getElementById("popupLobbyInvitation:" + hgm_lobby_id + ":name").innerHTML = hangmanLobby.name.length < 15 ? hangmanLobby.name : hangmanLobby.name.slice(0, 15) + '...'
        return
    }
    console.log("hangman error:",JSON.stringify(hangmanLobby))
    if (hangmanLobby.subscribed) // already subscribed
        return

    console.log("Create invitation for Hangman Lobby: " + hgm_lobby_id)
    console.log("PENDING LIST: " + Object.keys(hangmanLobby.pendingInvitations))

    if (!(myId in hangmanLobby.pendingInvitations)) // not invited
        return

    var invitationId = hangmanLobby.pendingInvitations[myId][0]
    var inviteUserId = hangmanLobby.operations[invitationId].fid
    var inviteUserName = tremola.contacts[inviteUserId].alias
    var lobby_name = hangmanLobby.name.length < 15 ? hangmanLobby.name : hangmanLobby.name.slice(0, 15) + '...'


    var invHTML = "<div id='popupLobbyInvitation:" + hgm_lobby_id + "' class=''>"
    invHTML += "<div class='popupLobbyInvitation-textContainer'>"
    invHTML += "<div id='popupLobbyInvitation" + hgm_lobby_id + ":name' style='grid-area: name; padding-top: 5px; padding-left: 10px;font-size:15px'>" + lobby_name + "</div>"
    invHTML += "<div style='grid-area: author; padding-top: 2px; padding-left: 10px;font-size:8px'>From: " + inviteUserName + "</div></div>"

    invHTML += "<div style='grid-area: btns;justify-self:end;display: flex;justify-content: center;align-items: center;'>"
    invHTML += "<div style='padding-right:8px;'>"
    //invHTML += "<div style='padding-right:10px;'>"
    invHTML += "<button class='buttontext' style=\"height: 40px; background-image: url('../img/checked.svg'); width: 35px;margin-right:10px;background-color: #51a4d2\" onclick='popupLobbyInvitation_Accept(\"" + hgm_lobby_id + "\")'>&nbsp;</button>"//</div>"
    invHTML += "<button class='buttontext' style=\"height: 40px; color: red; background-image: url('../img/cancel.svg');width: 35px;background-color: #51a4d2\" onclick='popupLobbyInvitation_Decline(\"" + hgm_lobby_id + "\")'>&nbsp;</button>"
    invHTML += "</div></div></div>"

    document.getElementById("popupLobbyInvitationsContent:div").innerHTML += invHTML
}
function popupLobbyInvitation_Accept(hgm_lobby_id){
    inviteHGMAccept(hgm_lobby_id, tremola.hangman[hgm_lobby_id].pendingInvitations[myId])
    delete tremola.hangman[hgm_lobby_id].pendingInvitations[myId]
    var inv = document.getElementById("popupLobbyInvitation:" + hgm_lobby_id)
    if (inv)
        inv.outerHTML = ""
}
function popupLobbyInvitation_Decline(){
    inviteHGMDecline(hgm_lobby_id, tremola.hangman[hgm_lobby_id].pendingInvitations[myId])
    delete tremola.hangman[hgm_lobby_id].pendingInvitations[myId]
    var inv = document.getElementById("popupLobbyInvitation:" + hgm_lobby_id)
    if (inv)
        inv.outerHTML = ""
}

function ui_update_lobby_title(hgm_lobby_id) {
    var hangmanLobby = tremola.hangman[hgm_lobby_id]
    // update board list
    load_hangmanLobby_list();
    // update title name
    /*if (curr_board == hgm_lobby_id) {
        var title = document.getElementById("conversationTitle"), bg, box;
        title.style.display = null;
        title.setAttribute('classList', hgm_lobby_id.forgotten ? ['gray'] : []);
        box = "<div style='white-space: nowrap;'><div style='text-overflow: ellipsis; overflow: hidden;text-align: left;'><font size=+2><strong>" + "Kanban: " + escapeHTML(board.name) + "</strong></font></div>";
        box += "<div style='color: black; text-overflow: ellipsis; overflow: hidden;text-align: left;'>" + escapeHTML(recps2display(board.members)) + "</div></div>";
        title.innerHTML = box;
    }*/
}

function load_hangmanLobby_list() {
    document.getElementById('lobbyList:div').innerHTML = '';
    if (Object.keys(tremola.hangman).length === 0)
        return
    var subLobbyIds = Object.keys(tremola.hangman).filter(key => tremola.hangman[key].subscribed).map(key => ({[key]: tremola.hangman[key]}))
    if (subLobbyIds.length > 0) {
        var subscribedLobbies = Object.assign(...subLobbyIds)
        var hgm_lobby_idTimestamp = Object.keys(subscribedLobbies).map(function (key) {
            return [key, subscribedLobbies[key].lastUpdate]
        }) // [0] = hgm_lobby_id, [1] = timestamp
        hgm_lobby_idTimestamp.sort(function (a, b) {
            return b[1] - a[1];
        })

        for (var i in hgm_lobby_idTimestamp) {
            var hgm_lobby_id = hgm_lobby_idTimestamp[i][0]
            var hangmanLobby = tremola.hangman[hgm_lobby_id]
            var date = new Date(hgm_lobby_idTimestamp[i][1])
            date = date.toDateString() + ' ' + date.toTimeString().substring(0, 5);
            if (hangmanLobby.forgotten /*&& tremola.settings.hide_forgotten_boards*/)
                continue
            var cl, mem, item, bg, row, badge, badgeId, cnt;
            cl = document.getElementById('lobbyList:div');
            mem = recps2display(hangmanLobby.members)
            item = document.createElement('div');
            item.setAttribute('style', "padding: 0px 5px 10px 5px; margin: 3px 3px 6px 3px;");
            if (hangmanLobby.forgotten) bg = ' gray'; else bg = ' light';
            row = "<button class='board_item_button w100" + bg + "' onclick='load_game(\"" + hgm_lobby_id + "\");' style='overflow: hidden; position: relative;'>";
            row += "<div style='white-space: nowrap;'><div style='text-overflow: ellipsis; overflow: hidden;'>" + hangmanLobby.name + "</div>";
            row += "<div style='text-overflow: clip; overflow: ellipsis;'><font size=-2>" + escapeHTML(mem) + ", </font><font size=-3>last changed: " + date + "</font> </div></div>";
            badgeId = hgm_lobby_id + "-badge_lobby"
            badge = "<div id='" + badgeId + "' style='display: none; position: absolute; right: 0.5em; bottom: 0.9em; text-align: center; border-radius: 1em; height: 2em; width: 2em; background: #e85132; color: white; font-size: small; line-height:2em;'>&gt;9</div>";
            row += badge + "</button>";
            row += ""
            item.innerHTML = row;
            cl.appendChild(item);
            //ui_set_board_list_badge(hgm_lobby_id)
        }
    }
}
function load_game(hgm_lobby_id) { //switches scene to board and changes title to board name
    curr_board = bid
    var b = tremola.board[bid]

    b.unreadEvents = 0
    persist()
    ui_set_board_list_badge(bid)

    var title = document.getElementById("conversationTitle"), bg, box;
    title.style.display = null;
    title.setAttribute('classList', bid.forgotten ? ['gray'] : []);
    box = "<div style='white-space: nowrap;'><div style='text-overflow: ellipsis; overflow: hidden;text-align: left;'><font size=+2><strong>" + "Kanban: " + escapeHTML(b.name) + "</strong></font></div>";
    box += "<div style='color: black; text-overflow: ellipsis; overflow: hidden;text-align: left;'>" + escapeHTML(recps2display(b.members)) + "</div></div>";
    title.innerHTML = box;

    document.getElementById("div:columns_container").innerHTML = "" //clear old content
    setScenario('board')
    document.getElementById("tremolaTitle").style.display = 'none';
    document.getElementById("tremolaTitle").style.position = 'fixed';
    title.style.display = null;

    load_all_columns()
    load_all_items()
}

function escapeHTML(str) {
    return new Option(str).innerHTML;
}

function ui_set_board_list_badge2(hgm_lobby_id) {
    var hangmanLobby = tremola.hangman[hgm_lobby_id]
    var e = document.getElementById(hgm_lobby_id + "-badge_lobby")
    var cnt
    if (hangmanLobby.unreadEvents == 0) {
        e.style.display = 'none'
        return
    }
    e.style.display = null
    if (hangmanLobby.unreadEvents > 9) cnt = ">9"; else cnt = "" + hangmanLobby.unreadEvents
    e.innerHTML = cnt
}

