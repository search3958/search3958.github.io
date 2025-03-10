let topSearchResults = [];

document.addEventListener("DOMContentLoaded", function () {
  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get("q");
  if (query) {
    document.getElementById("query-input").value = query;
    processQuery();
  }
});

function processQuery() {
  const userInput = document.getElementById("query-input").value;
  if (!userInput.trim()) {
    alert("質問や検索キーワードを入力してください");
    return;
  }

  history.replaceState(null, "", `?q=${encodeURIComponent(userInput)}`);

  const initialHeader = document.getElementById("initial-header");
  const minimizedHeader = document.getElementById("minimized-header");
  initialHeader.classList.add("fade-out");
  minimizedHeader.classList.add("fade-in");

  document.body.classList.remove("initial");
  document.getElementById("results-container").classList.add("visible");

  topSearchResults = [];
  document.getElementById("search-results").innerHTML = '<div class="loading">検索結果を取得中...</div>';
  const geminiDiv = document.getElementById("gemini-response");
  geminiDiv.innerHTML = '<div class="loading">AIの回答を生成中...</div>';
  geminiDiv.classList.remove("visible", "expanded");
  geminiDiv.classList.add("collapsed");
  document.getElementById("debug-prompt").innerHTML = "";
  const existingButton = document.getElementById("show-more-button");
  if (existingButton) {
    existingButton.remove();
  }
  performSearch(userInput);
}

async function performSearch(query) {
  const apiKey = "AIzaSyBlnvKCKYO-KGP-17jjI1AqJoBqVrr1cGM";
  const cx = "c07eb0bc40c2e41c2";
  const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${apiKey}&cx=${cx}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    const resultsDiv = document.getElementById("search-results");
    resultsDiv.innerHTML = "";
    if (data.items && data.items.length > 0) {
      data.items.slice(0, 5).forEach((item, i) => {
        topSearchResults.push({ title: item.title, snippet: item.snippet });
        setTimeout(() => {
          const resultItem = document.createElement("div");
          resultItem.classList.add("result-item");
          resultItem.style.animationDelay = i * 0.05 + "s";
          resultItem.innerHTML = `<h3><a href="${item.link}" target="_blank">${item.title}</a></h3><p>${item.snippet}</p>`;
          resultsDiv.appendChild(resultItem);
        }, i * 100);
      });
      sendToGemini(query);
    } else {
      resultsDiv.innerHTML = "<p>検索結果がありません。</p>";
      sendToGemini(query);
    }
    document.querySelector(".google-button-container").style.display = "block";
  } catch (error) {
    console.error("検索APIエラー:", error);
    document.getElementById("search-results").innerHTML = "<p>検索結果の取得中にエラーが発生しました。</p>";
    sendToGemini(query);
    document.querySelector(".google-button-container").style.display = "block";
  }
}

async function sendToGemini(userInput) {
  const apiKey = "AIzaSyCECb_RUgLUA8nS60T9nDqlo8MX3rYfe9Q";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  let prompt = userInput;
  if (topSearchResults.length >= 2) {
    prompt = `${userInput}について教えてください。現在、"${topSearchResults[0].snippet}"と"${topSearchResults[1].snippet}"の情報を得ています。長すぎない回答で教えてください。`;
  } else if (topSearchResults.length == 1) {
    prompt = `${userInput}について教えてください。現在、"${topSearchResults[0].snippet}"の情報を得ています。長すぎない回答で教えてください。`;
  }
  document.getElementById("debug-prompt").innerHTML = `送信プロンプト: ${prompt}`;
  const requestData = {
    contents: [{ parts: [{ text: prompt }] }]
  };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData)
    });
    const data = await response.json();
    const responseText = data.candidates && data.candidates[0]?.content?.parts[0]?.text;
    if (responseText) {
      let formattedText = responseText.replace(/```(\w*)([\s\S]*?)```/g, '<pre><code>$2</code></pre>').replace(/\n/g, '<br>');
      const geminiResponseDiv = document.getElementById("gemini-response");
      geminiResponseDiv.innerHTML = formattedText;
      setTimeout(() => {
        geminiResponseDiv.classList.add("visible");
      }, 50);
      geminiResponseDiv.classList.add("collapsed");
    } else {
      document.getElementById("gemini-response").innerHTML = "回答を取得できませんでした。";
    }
  } catch (error) {
    console.error("Gemini APIエラー:", error);
    document.getElementById("gemini-response").innerHTML = "Gemini APIエラー: " + error.message;
  }
}
