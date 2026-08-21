const fetch = require('node-fetch');

async function test() {
  const videoId = 'dQw4w9WgXcQ'; // Rick Astley
  const innertubeRes = await fetch('https://music.youtube.com/youtubei/v1/next?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB_REMIX',
            clientVersion: '1.20230522.01.00',
            hl: 'en',
            gl: 'US'
          }
        },
        videoId: videoId,
        playlistId: 'RDAMVM' + videoId
      })
    });
    
    const data = await innertubeRes.json();
    console.log("Keys:", Object.keys(data));
    const contents = data?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer?.contents;
    if (contents) {
        for (const item of contents) {
           const track = item.playlistPanelVideoRenderer;
           if (track) {
              const title = track.title?.runs?.[0]?.text;
              const artist = track.longBylineText?.runs?.[0]?.text;
              console.log(title, "-", artist);
           }
        }
    } else {
        console.log("Not found in path");
    }
}
test();
