import { Level } from 'level';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const dbPath = path.resolve(__dirname, 'mydb');
    console.log('Opening database at:', dbPath);
    const db = new Level(dbPath, { valueEncoding: 'json' });
    await db.open();
    
    const cameradb = db.sublevel('cameras', { valueEncoding: 'json' });
    
    console.log('\n--- CAMERAS ---');
    for await (const [key, value] of cameradb.iterator()) {
        console.log(`Key: ${key}`);
        console.log(`Name: ${value.name}`);
        console.log(`IP: ${value.ip}`);
        console.log(`Folder: ${value.folder}`);
        console.log(`enable_movement: ${value.enable_movement}`);
        console.log(`mSPollFrequency: ${value.mSPollFrequency}`);
        console.log(`motionUrl: ${value.motionUrl}`);
        console.log('----------------');
    }

    const movementdb = db.sublevel('movements', { valueEncoding: 'json' });
    
    console.log('\n--- MOVEMENTS ---');
    let count = 0;
    for await (const [key, value] of movementdb.iterator()) {
        count++;
        if (count <= 20) {
            console.log(`Key: ${key}`);
            console.log(`Camera: ${value.cameraKey}`);
            console.log(`State: ${value.processing_state}`);
            console.log(`Duration: ${value.seconds}s`);
            console.log(`Frames Sent: ${value.frames_sent_to_ml}`);
            console.log(`Frames Received: ${value.frames_received_from_ml}`);
            console.log(`Tags: ${JSON.stringify(value.tags)}`);
            console.log(`Error: ${value.processing_error}`);
            console.log('----------------');
        }
    }
    console.log(`Total Movements: ${count}`);
    
    await db.close();
}

main().catch(console.error);
