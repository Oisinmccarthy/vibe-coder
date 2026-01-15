const apiKey = "";
const apiURL = "https://api.openai.com/v1/chat/completions";
let isNewChat = true;
let openingMessage = "This is the beginning of a conversation where you build a javascript web based project for me. In each of your responses, only respond with code. if you have anything to say just add it as comments. it must be able to run in the browser. if an improvement is asked for, dont just provide that improved snippet, always provide the whole working program. if they ask you to change the styling, still include the whole working program in the response. use css to style it nicely unless told otherwise";

//array to store all messages between the user and the assistant
let chatHistory = [{
        "role": "system",
        "content": openingMessage
}];

//to handle undo and redo
let undone = [];
let aiSuggestions = [];
let undoneAISuggestions = [];

document.write ( `

<div style="background-color:#e9e9e9; min-height:100vh; padding:20px;">
<h1 style="text-align: center;"> Vibe Studio </h1>

<div>
    
    
    <div style="width:30vw; background-color:#f5f5f5; border:1px solid black; border-radius: 15px; margin:20px auto; padding: 20px;">
        <div id=heading>What would you like to create?</div>
        <textarea id=prompt style="width:100%;"></textarea><br>
        <div style="display:flex; gap:5px">
            <button onclick="createPrompt();" class=ab-normbutton>Send</button>
            <div id=restart> </div>
            <div id=previous> </div>
            <div id=redo> </div>
        </div>
        <div id=aisuggestion> </div>
        
        <div id=suggestions> </div>

    </div>
    
    <div style="display: flex">
        <div style="width:40vw; background-color:#f5f5f5; border:1px solid black;  border-radius: 15px; margin:20px auto; padding: 20px;">
            <h2>Generated Code</h2>
            <div id=response> </div>
        </div>
        <iframe id="running" sandbox="allow-scripts" style="width:40vw; height:60vh; border:1px solid black; background-color:#f5f5f5;  border-radius:15px; margin:20px auto; padding:20px; display:block;"></iframe>
    </div>
</div>
</div>

` );

//start on new chat
newChat();

function newChat() {
    isNewChat = true;
    
    //reset ui
    $("#heading").html("<p>What would you like to create?</p>");
    $("#response").html("");
    $("#running").html("");
    $("#previous").html("");
    $("#redo").html("");
    $("#restart").html("");
    $("#aisuggestion").html("");
    
    //clear iframe
    const iframe = document.getElementById("running");
    iframe.srcdoc = "";
    
    //reset chat history
    chatHistory = [{
        "role": "system",
        "content": openingMessage
    }];
    
    //reset input
    inputBox = document.getElementById("prompt");
    inputBox.value = "";
    
    //show starter prompt suggestions
    suggestions();
}

//set and show starter suggestions
function suggestions() {
    const all = `
        <p>Starter prompts to try:</p>
        <button onclick="useSuggestion('Make me a calculator');" class=ab-normbutton>Make me a calculator</button>
        <button onclick="useSuggestion('Make me a drawing tool');" class=ab-normbutton>Make me a drawing tool</button>
        <button onclick="useSuggestion('Make me a bouncing ball animation');" class=ab-normbutton>Make me a bouncy ball animation</button>
        <button onclick="useSuggestion('Make me an Xs and Os game');" class=ab-normbutton>Make me an X's and O's game</button>
    `;
    $("#suggestions").html(all);
}

//fill in input box with selected prompt
function useSuggestion(suggestion) {
    document.getElementById("prompt").value = suggestion;
    //createPrompt();
}

function createPrompt() {
    if (isNewChat) { //if it was a new chat, show items that were hidden
        isNewChat = false;
        $("#heading").html("<p>What changes would you like to make?</p>");
        $("#restart").html("<button onclick='newChat();' class=ab-normbutton>Start fresh</button>");
    }
    
    //set prompt and add to chat history
    const prompt = $("#prompt").val();
    chatHistory.push({
        "role": "user",
        "content": prompt
    });
    
    const jsonData = toJsonData(chatHistory); //convert to correct format
    sendPrompt(jsonData, showResponse); //send to api
    
    //clear the input box
    inputBox = document.getElementById("prompt");
    inputBox.value = "";
    
    if(!isNewChat) $("#suggestions").html(""); //remove starter suggestions
    
    
    if (undone.length > 0) {
        undone = []; //reset undone list when a prompt is sent
        $("#redo").html("");
    }
}

function sendPrompt(data, fn) {
    //setup ajax headers for request
    $.ajaxSetup({
        headers:
        {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + apiKey  
        }
    });
    
    //ajax call to api
    $.ajax({
        type: "POST",
        url: apiURL,
        data: data,
        dataType: "json",
        success: function (data) { 
            response = data["choices"][0].message.content;
            fn(response); 
        },
        error: function () { showError() }
    });
}

//format messages for api call
function toJsonData(messages) {
    return JSON.stringify(
        {
            "model": "gpt-3.5-turbo",
            "temperature": 0.7,
            "messages": messages
        }
    )
}

function showResponse(response) {
    //add ai response to chat history
    chatHistory.push({
        "role": "assistant",
        "content": response
    });
    console.log(response);
    response = removeFences(response); //remove html fence if there is one
    displayCode(response); //display the response
    runCode(response);
    aiSuggestion(); //generate ai suggestion for next prompt
}

function displayCode(code) {
    //show undo button if changes have been made
    if (chatHistory.length > 3) {
        $("#previous").html("<button onclick='goBack()' class=ab-normbutton>Undo</button>");
    } else {
        $("#previous").html("");
    }
    
    //show code in pre block so it stays formatted correctly
    $("#response").html("<pre></pre>");
    $("#response pre").text(code);

    console.log(chatHistory);
    
}

function runCode(code) {
    const iframe = document.getElementById("running");
    iframe.srcdoc = code; //writes code into iframe to run
}

function showError() {
    $("#response").html("Something went wrong. Try again");
}

//remove code fences (```html .... ```)
function removeFences(response) {
    if (response.startsWith("```html") && response.endsWith("```")) {
        return response.slice(7, -3); //remove first 7 and last 3 characters
    } else if (response.startsWith("```html")) {
        return response.slice(7); //remove first 7
    }
    return response;
}

function goBack() {
    //move most recent user and assistant messages into undone
    undone.push(chatHistory.pop());
    undone.push(chatHistory.pop());
    
    undoneAISuggestions.push(aiSuggestions.pop()); //same for most recent ai suggestion
    
    //show previous code
    const code = chatHistory[chatHistory.length-1].content;
    displayCode(removeFences(code));
    runCode(removeFences(code));
    
    //show previous ai suggestion
    const suggestion = aiSuggestions[aiSuggestions.length-1];
    showAISuggestion(suggestion);
    
    /*console.log(undone);
    console.log("Length: " + undone.length)*/
    
    //if anything has been undone show redo button
    if (undone.length >= 2) {
        $("#redo").html("<button onclick='redo()' class=ab-normbutton>Redo</button>");
    }
}

function redo() {
    //console.log(undone);
    
    //move undone messages back to chat history
    chatHistory.push(undone.pop());
    chatHistory.push(undone.pop());
    aiSuggestions.push(undoneAISuggestions.pop()); //same with ai suggestion
    //console.log(undone);
    
    //show code and suggestion
    const code = chatHistory[chatHistory.length-1].content;
    const suggestion = aiSuggestions[aiSuggestions.length-1];
    displayCode(removeFences(code));
    runCode(removeFences(code));
    showAISuggestion(suggestion);
    
    //remove redo option if nothing left to redo
    if (undone.length < 2) {
        $("#redo").html("");
    }
}

function aiSuggestion() {
    const code = chatHistory[chatHistory.length-1].content; //current code
    const prompt = "write me a prompt for a new feature or improvement to this code to be sent to the ai that made it. make it one short sentence. also dont give an opening like 'sure heres a prompt' just give the prompt. make sure the feature isnt something that is already there.:" + code;
    const data = [
        {
            "role": "system",
            "content": prompt
        }
    ]
    const jsonData = toJsonData(data);
    sendPrompt(jsonData, newAISuggestion); //send prompt to ai to give back a suggested prompt
}

function newAISuggestion(suggestion) {
    aiSuggestions.push(suggestion); //add do suggestions
    showAISuggestion(suggestion); //show it
}

//display suggestion button
function showAISuggestion(suggestion) {
    $("#aisuggestion").html(`
        <p>AI suggestion:</p>
        <button onclick="useSuggestion(\`${suggestion}\`);" class="ab-normbutton">
            ${suggestion}
        </button>
    `);
}