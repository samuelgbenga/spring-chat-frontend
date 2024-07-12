import React, { useEffect, useState } from "react";
import { over } from "stompjs";
import SockJS from "sockjs-client/dist/sockjs";

// globally declare with var
var stompClient = null;
export const ChatRoom = () => {
  //  initialize for states including
  // private public chat, tab (current channel can be a specific user can be public channel)
  const [privateChats, setPrivateChats] = useState(new Map());
  const [publicChats, setPublicChats] = useState([]);
  const [tab, setTab] = useState("CHATROOM");

  // the user data object has 4 properties
  // name, message, reciever name, connected (false by default)
  const [userData, setUserData] = useState({
    username: "",
    recievername: "",
    message: "",
    connected: false,
  });

  // next we set up the use effect to depend on
  // the user data and the
  // this right here is not that important
  // it is just to console log the user data
  // when ever a change is effected
  useEffect(() => {
    console.log(userData);
  }, [userData]);

  const connect = () => {
    // to connect you set up two things
    let sock = new SockJS("http://localhost:8080/ws");
    // make the stomp client run over Sockjs
    stompClient = over(sock);

    // finally we connect
    stompClient.connect({}, onConnected, onError);
  };

  // print custom error message if connection fail
  const onError = (error) => {
    console.log(error);
  };

  // handle on connection success
  // subscribe to the different channels available on the backend
  const onConnected = () => {
    // update user connect to true
    setUserData({ ...userData, connected: true });

    // subscribe the public channel
    stompClient.subscribe("/chatroom/public", onMessageReceived);
    stompClient.subscribe(
      "/user/" + userData.username + "/private",
      onPrivateMessage
    );

    // this joins a new user to some privat user with status JOIN
    userJoin();
  };

  // on private message gets the payload on subscription to a particular channel
  const onPrivateMessage = (payload) => {
    var payloadData = JSON.parse(payload.body);

    // if the particular sender exist
    if (privateChats.get(payloadData.senderName)) {
      privateChats.get(payloadData.senderName).push(payloadData);
      setPrivateChats(new Map(privateChats));
    }
    // else if the user does not exist
    // create a new user private map for that user
    // and add the private message to the lis
    else {
      //create an empty list
      let list = [];
      // push the payload into
      list.push(payloadData);
      // map the use to its payload
      privateChats.set(payloadData.senderName, list);
      // do react update
      setPrivateChats(new Map(privateChats));
    }
  };

  // on public message also gets the payload on subscription to that channel
  const onMessageReceived = (payload) => {
    // converts the payload body to json
    var payloadData = JSON.parse(payload.body);

    switch (payloadData.status) {
      // if the user status is joining for the first time
      // and the user does not exist in the private chat alread
      // creat a new private chat map for that user to map the user to there chat.
      // create the user private chat section if the user is just joining for
      // the first time.
      case "JOIN":
        if (!privateChats.get(payloadData.senderName)) {
          privateChats.set(payloadData.senderName, []);
          setPrivateChats(new Map(privateChats));
        }
        break;
      // if the user is sending a message (status message)
      // update the the  the user public message if messageid
      case "MESSAGE":
        publicChats.push(payloadData);
        setPublicChats([...publicChats]);
        break;
    }
  };

  // on new user join
  // this handles the first user message on join
  // it sends the user details to the general public.
  // without any message
  // use can joins the public chat by default
  const userJoin = () => {
    var chatMessage = {
      senderName: userData.username,
      status: "JOIN",
    };
    stompClient.send("/app/message", {}, JSON.stringify(chatMessage));
  };

  // handle send message public
  const handleSendMessage = () => {
    // if client is indeed connected
    if (stompClient) {
      // set the user detail including the message
      let chatMessage = {
        senderName: userData.username,
        message: userData.message,
        status: "MESSAGE",
      };

      // send the user details the message controller
      stompClient.send("/app/message", {}, JSON.stringify(chatMessage));
      // update the user message to empty string
      setUserData({ ...userData, message: "" });
    }
  };

  // handle send message private

  const handleSendPrivateMessage = () => {
    // check if the user is connected
    if (stompClient) {
      // set the user details including the message and the reciever
      let chatMessage = {
        senderName: userData.username,
        receiverName: tab,
        message: userData.message,
        status: "MESSAGE",
      };

      // check if the user is not sending the message to themself
      // push the message to the user private chat
      // then do react update
      if (userData.username !== tab) {
        privateChats.get(tab).push(chatMessage);
        setPrivateChats(new Map(privateChats));
      }

      // update the user message to empty string
      stompClient.send("/app/private-message", {}, JSON.stringify(chatMessage));
      setUserData({ ...userData, message: "" });
    }
  };

  // handle message input
  const handleMessage = (event) => {
    const { value } = event.target;
    setUserData({ ...userData, message: value });
  };

  // handle username input
  const handleUsername = (event) => {
    const { value } = event.target;
    setUserData({ ...userData, username: value });
  };

  // register the user first befor connecting
  const registerUser = () => {
    connect();
  };

  return (
    <div className="container">
      {userData.connected ? (
        <div className="chat-box">
    
        <div className="member-list">
        <ul>

          {/* onclic set the tab to the current tab */}
        <li
                onClick={() => {
                  setTab("CHATROOM");
                }}
                className={`member ${tab === "CHATROOM" && "active"}`}
              >
                Chatroom
              </li>

                {/* spreads all the user into an array and then list 
                them out */}

              {[...privateChats.keys()].map((name, index) => (
                
                <li
                  onClick={() => {
                    setTab(name);
                  }}
                  className={`member ${tab === name && "active"}`}
                  key={index}
                >
                  {name}
                </li>
              ))}
        </ul>
        </div>
          
          {/* if tab is chat room Starting  */}
          {/* read all from public chat */}
          {tab === "CHATROOM" ?
          
          (<div className="chat-content">
            <ul className="chat-messages">
              {
                publicChats.map((chat, index)=>(
                  <li
                  className={`message ${
                    chat.senderName === userData.username && "self"
                  }`}
                  key={index}
                  >
                      {chat.senderName !== userData.username && (
                      <div className="avatar">{chat.senderName}</div>)}
                      <div className="message-data">{chat.message}</div>
                      {chat.senderName === userData.username && (
                      <div className="avatar self">{chat.senderName}</div>
                    )}
                  </li>
                ))
              }
            </ul>

            <div className="send-message">
            <input
                  type="text"
                  className="input-message"
                  placeholder="enter the message"
                  value={userData.message}
                  onChange={handleMessage}
                />
                <button
                  type="button"
                  className="send-button"
                  onClick={handleSendMessage}
                >
                  send
                </button>
            </div>
          </div>)
          :
          // if tab is a user name
          // read from the user private chat.
          (<div className="chat-content">

            <ul className="chat-messages">
              {
                [...privateChats.get(tab)].map((chat, index)=> (

                  <li
                  className={`message ${
                    chat.senderName === userData.username && "self"
                  }`}
                  key={index}
                  >
                      {chat.senderName !== userData.username && (
                      <div className="avatar">{chat.senderName}</div>)}
                      <div className="message-data">{chat.message}</div>
                      {chat.senderName === userData.username && (
                      <div className="avatar self">{chat.senderName}</div>
                    )}
                  </li>
                ))

              }

              </ul> 


             <div className="send-message">
            <input
                  type="text"
                  className="input-message"
                  placeholder="enter the message"
                  value={userData.message}
                  onChange={handleMessage}
                />
                <button
                  type="button"
                  className="send-button"
                  onClick={handleSendPrivateMessage}
                >
                  send
                </button>
            </div>

          </div>)
        
        }

        </div>
      ) : (
        <div className="register">

        {/* register the user  */}
        {/* first interface */}
          <input
            id="user-name"
            placeholder="Enter your name"
            name="userName"
            value={userData.username}
            onChange={handleUsername}
            margin="normal"
          />
          <button type="button" onClick={registerUser}>
            connect
          </button>

        </div>
      )}
    </div>
  );
};
