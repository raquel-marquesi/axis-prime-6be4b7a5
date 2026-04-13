import { createClient } from 'supabase';

const supabase = createClient('your-supabase-url', 'your-anon-key');

function parseDate(dateString: string): Date {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? new Date() : date;
}

function norm(value: number): number {
    return value < 0 ? 0 : value;
}

function parsePeso(value: string): number {
    return parseFloat(value.replace(',', '.')) || 0;
}

async function createMissingProcesses(data: any[]): Promise<void> {
    for (const item of data) {
        const { date, peso } = item;
        const parsedDate = parseDate(date);
        const normalizedPeso = norm(parsePeso(peso));
        const { error } = await supabase
            .from('processes')
            .insert([{ date: parsedDate, peso: normalizedPeso }]);

        if (error) console.error('Error inserting process:', error);
    }
}

async function importHistorico(data: any[]): Promise<void> {
    await createMissingProcesses(data);
    console.log('Data import completed.');
}