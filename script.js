document.addEventListener("scroll", () => {
  const sections = document.querySelectorAll("section");
  const links = document.querySelectorAll(".link");
  

  let index = sections.length;

  while (--index && window.scrollY + 50 < sections[index].offsetTop) {}

  links.forEach(link => link.classList.remove("active"));
  links[index].classList.add("active");
});



document.getElementById('colorPicker').addEventListener('input', function(event) {
    const selectedColor = event.target.value;
    // カラーピッカーで選択した色を localStorage に保存
    localStorage.setItem('baseColor', selectedColor);
    // 選択した色を適用
    applyStoredColor();
});

function applyStoredColor() {
    // localStorage から baseColor を取得
    const baseColor = localStorage.getItem('baseColor');

    // カラーピッカーのデフォルト値を設定
    const colorPicker = document.getElementById('colorPicker');
    if (baseColor) {
        colorPicker.value = baseColor;

        // 色を処理
        const lightBackground = lightenColor(baseColor, 0.9);
        const lightElement = lightenColor(baseColor, 0.5);
        const lightTextColor = lightenColor(baseColor, 0.7);

        const darkBackground = darkenColor(baseColor, 0.9);
        const darkElement = darkenColor(baseColor, 0.4);
        const darkTextColor = darkenColor(baseColor, 0.8);

        // CSSカスタムプロパティに設定
        document.documentElement.style.setProperty('--background-light', lightBackground);
        document.documentElement.style.setProperty('--element-light', lightElement);
        document.documentElement.style.setProperty('--text-light', lightTextColor);
        document.documentElement.style.setProperty('--background-dark', darkBackground);
        document.documentElement.style.setProperty('--element-dark', darkElement);
        document.documentElement.style.setProperty('--text-dark', darkTextColor);
    } else {
        // baseColor がない場合はカラーピッカーのデフォルトを設定
        colorPicker.value = '#ff0000'; // 任意のデフォルトカラー
        console.warn('No baseColor found in localStorage.');
    }
}

// ページ読み込み時に baseColor を適用
window.addEventListener('DOMContentLoaded', applyStoredColor);

   const radioForm = document.getElementById('radioForm');
    const selectedName = document.getElementById('selectedName');
    const contentFrame = document.getElementById('contentFrame');
    const section2 = document.getElementById('section2');
    const heightInput = document.getElementById('heightInput');

    // ページの読み込み時にlocalStorageから値を取得して適用
    window.addEventListener('DOMContentLoaded', () => {
      const savedValue = localStorage.getItem('selectedRadio');
      if (savedValue) {
        const savedRadio = document.querySelector(`input[value="${savedValue}"]`);
        if (savedRadio) {
          savedRadio.checked = true;
          updateContent(savedRadio);
        }
      }

      // テキストボックスの初期値としてlocalStorageに保存された高さを設定
      const savedHeight = localStorage.getItem('sectionHeight');
      if (savedHeight) {
        heightInput.value = savedHeight;
        section2.style.height = `${savedHeight}px`;
      }
    });

    // ラジオボタンが変更されたときに呼び出す関数
    radioForm.addEventListener('change', function() {
      const selectedRadio = document.querySelector('input[name="content"]:checked');
      updateContent(selectedRadio);

      // 選択した値をlocalStorageに保存
      localStorage.setItem('selectedRadio', selectedRadio.value);
    });

    // 選択したラジオボタンの名前とiframeの内容を更新する関数
    function updateContent(selectedRadio) {
      const radioText = selectedRadio.parentElement.innerText;
      const radioId = selectedRadio.value;

      // ラジオボタンの名前とIDを表示
      selectedName.innerText = radioText;

      // iframeのsrcを変更
      contentFrame.src = `https://search3958.github.io/${radioId}.html`;
    }

    // テキストボックスで入力された高さをsection2に自動適用
    heightInput.addEventListener('input', function() {
      const newHeight = heightInput.value;

      if (newHeight && !isNaN(newHeight)) {
        section2.style.height = `${newHeight}px`;

        // 高さをlocalStorageに保存
        localStorage.setItem('sectionHeight', newHeight);
      } else {
        // 高さが無効な場合、デフォルトの高さを設定
        section2.style.height = '200px';
        localStorage.removeItem('sectionHeight');
      }
    });
