const { spawn } = require('child_process');
const path = require('path');

function getAniboomDescription(russianTitle, originalTitle) {
    return new Promise((resolve, reject) => {
        // Путь к скрипту должен быть абсолютным или относительно текущего файла
        const scriptPath = path.join(__dirname, 'aniboom_fetcher.py');
        
        // В Windows может потребоваться вызывать python.exe явно
        const pythonProcess = spawn('python', [scriptPath, russianTitle, originalTitle]);

        let stdoutData = '';
        let stderrData = '';

        pythonProcess.stdout.on('data', (data) => {
            stdoutData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            stderrData += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`[AniboomBridge] Python script exited with code ${code}`);
                console.error(`[AniboomBridge] stderr: ${stderrData}`);
                return reject(new Error(`Python script error: ${stderrData}`));
            }

            try {
                const result = JSON.parse(stdoutData);
                if (result.error) {
                    // Это не ошибка выполнения, а "бизнес-логика" ответа от парсера
                    console.warn(`[AniboomBridge] Parser returned an error: ${result.error}`);
                    // Возвращаем null, чтобы функция-обработчик знала, что описания нет
                    return resolve(null); 
                }
                resolve(result.description);
            } catch (e) {
                console.error('[AniboomBridge] Failed to parse JSON from python script:', e);
                console.error('[AniboomBridge] Raw stdout:', stdoutData);
                reject(new Error('Failed to parse python script output.'));
            }
        });

        pythonProcess.on('error', (err) => {
            console.error('[AniboomBridge] Failed to start python process:', err);
            reject(err);
        });
    });
}

module.exports = { getAniboomDescription }; 