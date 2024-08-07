var curr_lobby; //holds id of current lobby
var gameRunning = false;

const HGMOperation = {
    HGM_LOBBY_CREATE: 'HGM_lobby/create',
    INVITE: 'invite',
    INVITE_ACCEPT: 'invite/accept',
    INVITE_DECLINE: 'invite/decline',
    LEAVE: 'leave',
    GUESS_LETTER: 'guessLetter', //user submitted a letter guess
    GUESS_WORD: 'guessWord', //user guessed a word
    WIN: 'win',
    LOSE: 'lose'
}

function createHGMLobby(lobbyName,hangmanWord) {
    var cmd = [HGMOperation.HGM_LOBBY_CREATE, lobbyName, hangmanWord]
    var data = {
        'hgm_lobby_id': null,
        'cmd': cmd,
        'prev': null
    }
    hGM_send_to_backend(data)
}
function guessHGMLetter(letter,lobbyID){
    var cmd = [HGMOperation.GUESS_LETTER, letter]
    var data = {
        'hgm_lobby_id': lobbyID,
        'cmd': cmd,
        'prev': null
    }
    hGM_send_to_backend(data)
}
function guessHGMWord(word,lobbyID){
    var cmd = [HGMOperation.GUESS_WORD, word]
    var data = {
        'hgm_lobby_id': lobbyID,
        'cmd': cmd,
        'prev': null
    }
    hGM_send_to_backend(data)
}
function hGM_send_to_backend(data) {
    var hgm_lobby_id = data['hgm_lobby_id'] != null ? data['hgm_lobby_id'] : "null"
    var prevs = data['prev'] != null ? btoa(data['prev'].map(btoa)) : "null"
    var op = data['cmd'][0] //btoa(data['cmd'][0])
    var args = data['cmd'].length > 1 ? btoa(data['cmd'].slice(1).map(unicodeStringToTypedArray).map(btoa)) : "null"
    var to_backend = ['hangman', hgm_lobby_id, prevs, op, args]
    backend(to_backend.join(" "))
}

function hangman_new_lobby(e) {
    console.log("hangman_new_lobby", JSON.stringify(e));
    // parse data
    var op = e.public[3];
    var hgm_lobby_id = op == HGMOperation.HGM_LOBBY_CREATE ? e.header.ref : e.public[1];
    var prev = e.public[2] != "null" ? e.public[2] : [];
    var args = e.public.length > 4 ? e.public.slice(4) : [];

    // add new entry if it is a new lobby
    if (!(hgm_lobby_id in tremola.hangman)) {
        tremola.hangman[hgm_lobby_id] = {
            "operations": {}, // all received operations for this lobby
            "sortedOperations": new Timeline(), // "linear timeline", sorted list of operationIds
            "members": [e.header.fid], // members of the hangman lobby
            "forgotten": false, // flag for hiding this lobby from the lobby list
            "name": hgm_lobby_id.toString().slice(0, 15) + '...', // name of the lobby
            "hangmanWord": [], //hangman word of lobby
            "guessedLetters": [], //guessed letters
            "guessedWords": [], //guessed words
            "remainingAttempts": [], //amount of attempts left
            "winner" : [], //winner of the game
            "curr_prev": [], // prev pointer
            "history": [],
            "lastUpdate": Date.now(),
            "unreadEvents": 0,
            "subscribed": false,
            "pendingInvitations": {}, // User: [inviteIds]
            "key": hgm_lobby_id.toString(),
            //"flags": []
        }
    }
     var hangmanLobby = tremola.hangman[hgm_lobby_id]

        if (op == HGMOperation.HGM_LOBBY_CREATE) {
            hangmanLobby.name = args[0]
            hangmanLobby.hangmanWord = args[1]
            //hangmanLobby.flags = args.slice(1)
            if (document.getElementById('popupLobbyInvitations:div').style.display != 'none')
                if (document.getElementById("popupLobbyInvitation:" + hgm_lobby_id))
                    lobbyCreateInvitation(hgm_lobby_id)
            if (e.header.fid == myId)
                hangmanLobby.subscribed = true // the creator is automatically subscribed
        }

        if (!(hangmanLobby.sortedOperations instanceof Timeline)) { // deserialize ScuttleSort-Timeline
            hangmanLobby.sortedOperations = Timeline.fromJSON(hangmanLobby.sortedOperations)
        }

        if (e.header.ref in hangmanLobby.operations)
            return

        // translation of the event format into the lobby format
        var body = {
            'hgm_lobby_id': hgm_lobby_id,
            'cmd': [op].concat(args),
            'prev': prev
        }

        // store new event
        var p = {"key": e.header.ref, "fid": e.header.fid, "fid_seq": e.header.seq, "body": body, "when": e.header.tst};
        hangmanLobby["operations"][e.header.ref] = p;

        if (op == HGMOperation.LEAVE && e.header.fid == myId) {
            delete hangmanLobby.pendingInvitations[myId]
            hangmanLobby.subscribed = false
            load_hangmanLobby_list()
        }
        if (hangmanLobby.subscribed) {
            hangmanLobby.sortedOperations.add(e.header.ref, prev)

            var independentOPs = [HGMOperation.LEAVE] // these operations cannot be overwritten; their position in the linear timeline does not affect the resulting lobby

            if (hangmanLobby.sortedOperations.name2p[e.header.ref].indx == hangmanLobby.sortedOperations.linear.length - 1 || independentOPs.indexOf(hangmanLobby.operations[e.header.ref].body.cmd[0]) >= 0) { //if the new event is inserted at the end of the linear timeline or the position is irrelevant for this operation
                apply_operationHangman(hgm_lobby_id, e.header.ref)
            } else {
                console.log("DEBUG APPLYALL")
                apply_all_operationsHangman(hgm_lobby_id)
            }

            hangmanLobby.curr_prev = hangmanLobby.sortedOperations.get_tips()
            hangmanLobby.lastUpdate = Date.now()
            hangmanLobby.unreadEvents++

            load_hangmanLobby_list()

            // invite selected users (during Lobby creation)
            if (op == HGMOperation.HGM_LOBBY_CREATE && e.header.fid == myId) {
                var pendingInvites = []
                for (var m in tremola.contacts) {
                    if (m != myId && document.getElementById(m).checked) {
                        inviteUserHGMLobby(hgm_lobby_id, m)
                        console.log("Invited: " + m)
                    }
                }
            }
        } else {
            if (op == HGMOperation.INVITE && body.cmd[1] == myId) { // received invitation to lobby
                if (myId in hangmanLobby.pendingInvitations)
                    hangmanLobby.pendingInvitations[myId].push(e.header.ref)
                else {
                    hangmanLobby.pendingInvitations[myId] = [e.header.ref]
                    //if (document.getElementById('popupLobbyInvitations:div').style.display != 'none') {
                        lobbyCreateInvitation(hgm_lobby_id)
                        console.log("create invite NAME:" + tremola.hangman[hgm_lobby_id].name)
                   // }

                }
            }

            if (op == HGMOperation.INVITE_ACCEPT && e.header.fid == myId) { // invitation accepted -> start sorting all events
                hangmanLobby.subscribed = true
                lobby_reload(hgm_lobby_id)
                hangmanLobby.lastUpdate = Date.now()
                hangmanLobby.unreadEvents++
                hangmanLobby.curr_prev = hangmanLobby.sortedOperations.get_tips()
                load_hangmanLobby_list()
                return
            }

            if (op == HGMOperation.INVITE_DECLINE && e.header.fid == myId) {
                delete hangmanLobby.pendingInvitations[myId]
            }
        }
    }

function lobby_reload(hgm_lobby_id) {
    console.log("Hangman lobby reload " + hgm_lobby_id)
    var hangmanLobby = tremola.hangman[hgm_lobby_id]
    hangmanLobby.pendingOperations = {}
    hangmanLobby.pendingInvitations = {}
    hangmanLobby.members = []
    hangmanLobby.sortedOperations = new Timeline()

    for (var op in hangmanLobby.operations) {
        console.log("ADD op: " + op + ", prev:" + hangmanLobby.operations[op].body.prev)
        hangmanLobby.sortedOperations.add(op, hangmanLobby.operations[op].body.prev)
    }
    apply_all_operationsHangman(hgm_lobby_id)

}

function inviteHGMAccept(hgm_lobby_id, prev) {
    var hangmanLobby = tremola.hangman[hgm_lobby_id]
    var data = {
        'hgm_lobby_id': hgm_lobby_id,
        'cmd': [HGMOperation.INVITE_ACCEPT],
        'prev': prev
    }
    hGM_send_to_backend(data)
}
function inviteHGMDecline(hgm_lobby_id, prev) {
    var hangmanLobby = tremola.hangman[hgm_lobby_id]
    var data = {
        'hgm_lobby_id': hgm_lobby_id,
        'cmd': [HGMOperation.INVITE_DECLINE],
        'prev': prev
    }
    hGM_send_to_backend(data)
}
function inviteUserHGMLobby(hgm_lobby_id, userID) {
    var hangmanLobby = tremola.hangman[hgm_lobby_id]
    var data = {
        'hgm_lobby_id': hgm_lobby_id,
        'cmd': [HGMOperation.INVITE, userID],
        'prev': hangmanLobby.curr_prev
    }
    hGM_send_to_backend(data)
}
function apply_operationHangman(hgm_lobby_id, operationID, apply_on_ui) {
    console.log("Apply:" + operationID)
    var hangmanLobby = tremola.hangman[hgm_lobby_id]
    var curr_op = hangmanLobby['operations'][operationID]

    var author_name = tremola.contacts[curr_op.fid].alias
    var historyMessage = author_name + " "

    switch (curr_op.body.cmd[0]) {
        case HGMOperation.HGM_LOBBY_CREATE:
            historyMessage += "created the lobby \"" + curr_op.body.cmd[1] + "\""
            hangmanLobby.name = curr_op.body.cmd[1]
            if (hangmanLobby.members.indexOf(curr_op.fid) < 0)
                hangmanLobby.members.push(curr_op.fid)
            if (curr_op.fid == myId)
                hangmanLobby.subscribed = true
            break
        case HGMOperation.INVITE:
            historyMessage += "invited " + curr_op.body.cmd[1] + "."
            console.log("IDX: " + hangmanLobby.members.indexOf(curr_op.body.cmd[1]))
            console.log("INVITE USER: " + curr_op.body.cmd[1])
            console.log("PENDING: " + hangmanLobby.pendingInvitations)

            if (hangmanLobby.members.indexOf(curr_op.body.cmd[1]) < 0) {
                if (!(curr_op.body.cmd[1] in hangmanLobby.pendingInvitations))
                    hangmanLobby.pendingInvitations[curr_op.body.cmd[1]] = []
                console.log("PENDING: " + hangmanLobby.pendingInvitations)
                hangmanLobby.pendingInvitations[curr_op.body.cmd[1]].push(curr_op.key)
            }

            break
        case HGMOperation.INVITE_ACCEPT:
            if (curr_op.fid in hangmanLobby.pendingInvitations) { // check if the invite accept operation is valid
                // check if one of the prevs of the accept message is actual a valid invitation
                if (hangmanLobby.pendingInvitations[curr_op.fid].filter(op => hangmanLobby.operations[curr_op.key].body.prev.includes(op)).length > 0) {
                    historyMessage += "accepted invitation"
                    delete hangmanLobby.pendingInvitations[curr_op.fid]
                    if (hangmanLobby.members.indexOf(curr_op.fid) < 0) { //should always be the case
                        hangmanLobby.members.push(curr_op.fid)
                        console.log("MEMBERS" + hangmanLobby.members)
                    }
                    if (curr_op.fid == myId)
                        hangmanLobby.subscribed = true
                    if (!gameRunning)
                        ui_update_lobby_title(hgm_lobby_id)
                    break
                }
            }
            console.log("WRONG INVITATION")
            break
        case HGMOperation.INVITE_DECLINE:
            if (curr_op.fid in hangmanLobby.pendingInvitations) { // check if the invite accept operation is valid
                if (hangmanLobby.pendingInvitations[curr_op.fid].filter(op => hangmanLobby.operations[curr_op.key].body.prev.includes(op)).length > 0) {
                    historyMessage += "declined invitation"
                    delete hangmanLobby.pendingInvitations[curr_op.fid]
                    var idx = hangmanLobby.members.indexOf(curr_op.fid)
                    if (idx >= 0) { // should never be the case
                        hangmanLobby.members.splice(idx, 1)
                    }
                }
            }
            break
        case HGMOperation.LEAVE:
            historyMessage += "left"
            var idx = hangmanLobby.members.indexOf(curr_op.fid)
            if (idx >= 0) {
                hangmanLobby.members.splice(idx, 1)
            }
            delete hangmanLobby.pendingInvitations[curr_op.fid]
            if (!gameRunning)
                ui_update_lobby_title(hgm_lobby_id)
            break
        case HGMOperation.GUESS_LETTER:
            //check if letter already guessed
            if ((curr_op.body.cmd[1] in hangmanLobby.guessedLetters))
                break
            hangmanLobby.guessedLetters.push(curr_op.body.cmd[1])
            historyMessage += "guessed Letter" + curr_op.body.cmd[1];
            if (gameRunning)
                receiveLetterGuess(tremola.contacts[curr_op.fid].alias,curr_op.body.cmd[1]);
            break
        case HGMOperation.GUESS_WORD:
            //check if letter already guessed
            if ((curr_op.body.cmd[1] in hangmanLobby.guessedWords))
                break
            hangmanLobby.guessedWords.push(curr_op.body.cmd[1])
            historyMessage += "guessed Word" + curr_op.body.cmd[1];
            if (gameRunning)
                receiveLetterGuess(tremola.contacts[curr_op.fid].alias,curr_op.body.cmd[1]);
            break
    }
    //historyMessage += ",  " + curr_op.key // debug
    hangmanLobby.history.push([curr_op.fid, historyMessage])
    persist()
}

function apply_all_operationsHangman(hgm_lobby_id) {
    var hangmanLobby = tremola.hangman[hgm_lobby_id]
    hangmanLobby.history = []
    var old_state = JSON.parse(JSON.stringify(hangmanLobby));
    //execute operations and save results to local storage
    var validOps = helper_linear_timeline_without_pending_prevs(hangmanLobby.sortedOperations)
    for (var i in validOps) {
        apply_operationHangman(hgm_lobby_id, validOps[i], false)
    }
}
// returns linear timeline that does not contain nodes which have only pending predecessors
function helper_linear_timeline_without_pending_prevs(timeline) {
    var lst = []
    for (let n of timeline.linear) {
        var validPrevs = 0
        for (let p of n.prev) {
            if ((typeof p != "string") && !(p.name in timeline.pending))
                validPrevs++
        }
        if (validPrevs > 0 || n.prev.length == 0) {
            lst.push(n.name);
        }
    }
    return lst;
}
