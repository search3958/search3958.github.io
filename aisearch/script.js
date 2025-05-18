//新しいタブに追加する機能の案
let topSearchResults = [];

document.addEventListener("DOMContentLoaded", function () {
  const urlParams = new URLSearchParams(window.location.search);
  const modeParam = urlParams.get("mode");
  window.promptMode = modeParam || "default";
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
    if (window.promptMode === "simple") {
      prompt = `"${userInput}" 参考情報:"${topSearchResults[0].snippet}"，"${topSearchResults[1].snippet}"`;
    } else if (window.promptMode === "summary") {
      prompt = `"${userInput}" また，箇条書きなどでわかりやすくまとめてください。"${topSearchResults[0].snippet}"，"${topSearchResults[1].snippet}"`;
    } else {
      prompt = `"${userInput}" 柔らかい感じで太字などは使わず回答してください。以下の検索結果も参考に、わかりやすく回答してください"${topSearchResults[0].snippet}"，"${topSearchResults[1].snippet}"`;
    }
  } else if (topSearchResults.length == 1) {
    if (window.promptMode === "simple") {
      prompt = `"${userInput}" 参考情報:"${topSearchResults[0].snippet}"`;
    } else if (window.promptMode === "summary") {
      prompt = `"${userInput}" また，箇条書きなどでわかりやすくまとめてください"${topSearchResults[0].snippet}"`;
    } else {
      prompt = `"${userInput}" 柔らかい感じで太字などは使わず回答してください。以下の検索結果も参考に、わかりやすく回答してください"${topSearchResults[0].snippet}"，"${topSearchResults[1].snippet}"`;
    }
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
      let formattedText = responseText
        .replace(/```(\w*)([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
        .replace(/\n/g, '<br>');

      const geminiResponseDiv = document.getElementById("gemini-response");
      geminiResponseDiv.innerHTML = ""; // 既存の内容をクリア

      const maxLength = 300; // 300文字以上なら折りたたむ
      if (formattedText.length > maxLength) {
        const shortDiv = document.createElement("div");
        shortDiv.innerHTML = formattedText.substring(0, maxLength) + "...";
        shortDiv.id = "short-gemini-response";

        const fullDiv = document.createElement("div");
        fullDiv.innerHTML = formattedText;
        fullDiv.id = "full-gemini-response";
        fullDiv.style.display = "none"; // 初期状態では非表示

        const showMoreButton = document.createElement("button");
        showMoreButton.innerText = "もっと表示";
        showMoreButton.id = "show-more-button";
        showMoreButton.addEventListener("click", () => {
          shortDiv.style.display = "none";
          fullDiv.style.display = "block";
          showMoreButton.style.display = "none"; // ボタンを非表示
        });

        // 要素を追加する順番を変更 (shortDiv → ボタン → fullDiv)
        geminiResponseDiv.appendChild(shortDiv);
        geminiResponseDiv.appendChild(showMoreButton);
        geminiResponseDiv.appendChild(fullDiv);
      } else {
        geminiResponseDiv.innerHTML = formattedText;
      }

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
