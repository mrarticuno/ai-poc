const ffmpeg = require('ffmpeg');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const client = new OpenAI();

async function processVideo(fileName, systemRoleContent) {
	try {
		const video = await new ffmpeg(fileName);
		const videoName = path.basename(fileName, path.extname(fileName));
		const outputDir = path.join(__dirname, videoName);

		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir);
		}

		await video.fnExtractFrameToJPG(
			outputDir,
			{
				frame_rate: 1,
				number: null,
				file_name: 'frame_%t_%s'
			},
			async (error, files) => {
				if (error) {
					console.log('Error:', error);
					return;
				}

				const base64Array = [];
				for (const file of files) {
					const base64 = await fs.promises.readFile(file, { encoding: 'base64' });
					base64Array.push(base64);
				}

				const PROMPT_MESSAGES = [
					{
						role: 'system',
						content: systemRoleContent
					},
					{
						role: 'user',
						content: [
							...base64Array
								.filter((_, index) => index % 50 === 0)
								.map((frame) => ({ image: frame, resize: 768 }))
						]
					}
				];

				try {
					const params = {
						model: 'gpt-4o',
						messages: PROMPT_MESSAGES,
						max_tokens: 1500
					};
					// console.log(JSON.stringify(params, null, 2))
					const response = await client.chat.completions.create(params);
					console.log('Response:', JSON.stringify(response, null, 2));
				} catch (err) {
					console.log('Error:', err);
				}
			}
		);
	} catch (e) {
		console.log(e.code);
		console.log(e.msg);
	}
}

// Example usage
processVideo(
	'video-30.8-16.5-KDsQheQY2Ug.mp4',
	'This AI model is designed to analyze bus monitoring videos and generate detailed incident reports, focusing on the actions of the bus driver. The reports will highlight any behaviors or actions that a bus driver should not be doing while driving, presented in a cursive text format that mimics traditional incident reporting. Respond in Portuguese.'
);
