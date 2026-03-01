import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
let total = 0;
while (true) {
    const { data } = await sb.from('game_sessions').update({ status: 'completed' }).neq('status', 'completed').select('id');
    if (!data || data.length === 0) break;
    total += data.length;
    console.log('Batch:', data.length);
}
console.log('Total cleaned:', total);
const { count } = await sb.from('game_sessions').select('id', { count: 'exact', head: true }).neq('status', 'completed');
console.log('Remaining non-completed:', count);
