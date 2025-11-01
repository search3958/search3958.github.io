// ページ読み込み完了後に実行（DOMContentLoaded）
document.addEventListener('DOMContentLoaded', function () {
  if (localStorage.getItem('termsAccepted') === 'false') {
    window.location.href = 'https://search3958.github.io/terms_not_accepted.html';
  }
});