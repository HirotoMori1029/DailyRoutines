//todo 修正予定

const weatherUrl = "https://tenki.jp/forecast/9/44/8520/41401/10days.html"

//スクレイピングして、降水確率を返す関数
function getPrecipByScraping(date) {
  const response = UrlFetchApp.fetch(weatherUrl);
  const text = response.getContentText("utf-8");
  const dayDiff = getDayDiffFromCurrentDate(date);
  //降水確率部分を抽出
  const probPrecip = Parser.data(text).from('<div class="prob-precip">').to('</div>').iterate();
  probPrecip.shift();
  return probPrecip[dayDiff].replace("%", '');

}