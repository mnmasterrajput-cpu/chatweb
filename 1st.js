let username = null;
let unique_id = null;
let group_unique_id = null;
let groupId = null;

window.onload = function() {
    document.getElementById("loginPopup").style.display = "flex";
};

function newgroup() {
    let popup = document.getElementById("popup");
    let maindiv = document.getElementById("main1");
    maindiv.style.display = "none";
    popup.style.display = "block";
}

function ret() {
    let popup = document.getElementById("popup");
    let maindiv = document.getElementById("main1");
    maindiv.style.display = "block";
    popup.style.display = "none";
}
    
function createg() {
    let msg2 = document.getElementById("input").value;
    if(msg2.trim() === "") return;

    fetch("https://chatweb-ka1f.onrender.com/groups", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            unique_id: unique_id,
            group_name: msg2
        })
    })
    .then((response) => response.json())
    .then((data) => {
        let group_unique_id = data.group_unique_id;
        console.log("Group created with ID:", group_unique_id);

        let cgroup = document.createElement("div");
        cgroup.classList.add("newgroup");

        let groupsbtn = document.createElement("button");
        groupsbtn.classList.add("ngbtn");
        groupsbtn.innerText = msg2;
        groupsbtn.dataset.groupId = group_unique_id;

        groupsbtn.addEventListener("click", join_group);

        cgroup.appendChild(groupsbtn);
        document.getElementById("x").appendChild(cgroup);
        cgroup.style.display = "block";

        ret();
        document.getElementById("input").value = "";
    })
    .catch((error) => {
        console.error("Error:", error);
    });
}

function sign() {
    let usernameInput = document.getElementById("username").value;
    let passwordInput = document.getElementById("password").value;

    if (usernameInput === "" || passwordInput === "") {
        alert("Please enter username and password");
        return;
    }

    fetch("https://chatweb-ka1f.onrender.com/message", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: usernameInput,
            password: passwordInput
        })
    })
    .then((response) => response.json())
    .then((data) => {
        console.log("Server ka response:", data);
        unique_id = data.unique_id;
        username = data.username;
        
        document.getElementById("loginPopup").style.display = "none";
        recivegroup();
    })
    .catch((error) => {
        console.error("Error:", error);
    });
} 

function groupdetail() {
    fetch("https://chatweb-ka1f.onrender.com/groups", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            unique_id: unique_id,
            group_name: document.getElementById("input").value
        })
    })
    .then((response) => response.json())
    .then((data) => {
        group_unique_id = data.group_unique_id;
        console.log("Group created:", group_unique_id);
    })
    .catch((error) => {
        console.error("Error:", error);
    });
}

function recivegroup() {
    fetch("https://chatweb-ka1f.onrender.com/sendgroup", {
        method: "GET"
    })
    .then((result) => result.json())
    .then((data) => {
        console.log("Database se groups:", data);
        
        document.getElementById("x").innerHTML = "";

        data.groups.forEach((group) => {
            let cgroup = document.createElement("div");
            cgroup.classList.add("newgroup");

            let groupsbtn = document.createElement("button");
            groupsbtn.classList.add("ngbtn");
            groupsbtn.innerText = group.group_name;
            groupsbtn.dataset.groupId = group.group_unique_id;

            groupsbtn.addEventListener("click", join_group);

            cgroup.appendChild(groupsbtn);
            document.getElementById("x").appendChild(cgroup);
            cgroup.style.display = "block";
        });
    })
    .catch((error) => {
        console.error("Error:", error);
    });
}

const socket = io("https://chatweb-ka1f.onrender.com");

socket.on("connect", () => {
    console.log("SOCKET CONNECTED:", socket.id);
});

socket.on("disconnect", () => {
    console.log("SOCKET DISCONNECTED");
});
 
function join_group(event) {
    let button = event.currentTarget;
    groupId = button.dataset.groupId;
    let groupName = button.innerText;

    document.getElementById("y").style.display = "flex";
    document.getElementById("groupname").innerText = groupName;
    document.getElementById("main1").classList.add("chat-active");
  
    getmsg();

    socket.emit("message", {
        type: "join_request",
        user_unique_id: unique_id,
        group_unique_id: groupId
    });
}

function sendbtn() {
    let msg = document.getElementById("msg").value;
    if (msg.trim() === "") {
        return;
    }

    let formattedMessage = username + ": " + msg;

    socket.emit("send_message", {
        message_unique_id: Date.now(),
        sender_unique_id: unique_id,
        group_unique_id: groupId,
        message: formattedMessage
    });
    
    document.getElementById("msg").value = "";
}

document.getElementById("msg").addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        sendbtn();
    }
});

function getmsg() {
    let messagesDiv = document.getElementById("messages");
    messagesDiv.innerHTML = "";

    fetch(`https://chatweb-ka1f.onrender.com/sendmsg?group_unique_id=${groupId}`, {
        method: "GET"
    })
    .then((result) => result.json())
    .then((data) => {
        data.messages.forEach((msgObj) => {
            let newDiv = document.createElement("div");
            newDiv.innerText = msgObj.message;

            if (String(msgObj.sender_unique_id) === String(unique_id)) {
                newDiv.classList.add("right");
            } else {
                newDiv.classList.add("left");
            }

            document.getElementById("messages").appendChild(newDiv);
            newDiv.style.display = "block";
        });
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    })
    .catch((error) => {
        console.error("Error:", error);
    });
}

socket.on("receive_message", (data) => {
    console.log("🔥 LIVE MESSAGE RECEIVED:", data);

    if (String(data.group_unique_id) !== String(groupId)) {
        return;
    }

    let newDiv = document.createElement("div");
    newDiv.innerText = data.message;

    if (String(data.sender_unique_id) === String(unique_id)) {
        newDiv.classList.add("right");
    } else {
        newDiv.classList.add("left");
    }

    document.getElementById("messages").appendChild(newDiv);
    newDiv.style.display = "block";
    document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight;
});

function goBack() {
    document.getElementById("main1").classList.remove("chat-active");
}

function login() {
    let usernameInput = document.getElementById("username").value;
    let passwordInput = document.getElementById("password").value;

    if (usernameInput === "" || passwordInput === "") {
        alert("Please enter both username and password");
        return;
    }

    fetch("https://chatweb-ka1f.onrender.com/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: usernameInput,
            password: passwordInput
        })
    })
    .then((response) => response.json())
    .then((data) => {
        console.log("Login Response:", data);

        if (data.success) {
            unique_id = data.unique_id;
            username = data.username;

            document.getElementById("loginPopup").style.display = "none";
            recivegroup();
        } else {
            alert(data.message || "Invalid username or password!");
        }
    })
    .catch((error) => {
        console.error("Login Error:", error);
    });
}