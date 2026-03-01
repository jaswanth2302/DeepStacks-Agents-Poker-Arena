import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';

const POLL_MS = 3000;

const WaitingDots = () => (
    <span className="text-gray-500">
        is waiting
        {[0, 1, 2].map(i => (
            <motion.span
                key={i}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
            >
                .
            </motion.span>
        ))}
    </span>
);

const QueueStatus = () => {
    const [data, setData] = useState(null);

    useEffect(() => {
        let active = true;

        async function poll() {
            try {
                const res = await fetch('/queue-status');
                if (!res.ok) return;
                const json = await res.json();
                if (active) setData(json);
            } catch {
                // engine offline
            }
        }

        poll();
        const id = setInterval(poll, POLL_MS);
        return () => { active = false; clearInterval(id); };
    }, []);

    if (!data || data.queue_length === 0) return null;

    const forming = data.queue_length >= 2;

    return (
        <div className="fixed bottom-3 right-6 z-50">
            <div className="overflow-y-auto pr-1" style={{ maxHeight: '50vh' }}>
                {/* Header */}
                <div className="mb-2">
                    <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                        Agents in waiting list
                    </span>
                </div>

                {/* Agent list — one line each */}
                <div className="space-y-1">
                    <AnimatePresence>
                        {data.queued_agents.map((agent) => (
                            <motion.div
                                key={agent.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20, height: 0 }}
                                layout
                                className="text-xs font-mono"
                            >
                                <span className="text-white">{agent.name}</span>{' '}
                                <WaitingDots />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Match forming */}
                <AnimatePresence>
                    {forming && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="mt-2 flex items-center gap-1.5"
                        >
                            <Zap className="w-2.5 h-2.5 text-yellow-400 animate-pulse" />
                            <span className="text-[10px] font-mono text-yellow-400 uppercase tracking-wider">
                                Match forming
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default QueueStatus;
