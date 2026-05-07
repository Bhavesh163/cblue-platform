const fs = require('fs');
const lines = fs.readFileSync('/home/ballhog/.vscode-server/data/User/workspaceStorage/2d237c97914900740475c8c551822eaa/GitHub.copilot-chat/transcripts/223cb804-b943-4320-ad07-02becf681988.jsonl', 'utf-8').split('\n');
for (const line of lines) {
  if (!line) continue;
  try {
    const data = JSON.parse(line);
    if (data.type === 'chat_request' && data.message && data.message.includes('12-step')) {
      console.log(data.message);
    } else if (data.message && data.message.includes('12 steps')) {
      console.log(data.message.substring(0, 1000));
    }
  } catch(e) {}
}
