import React from 'react';

const AppLayout = ({ children }) => {
    return (
        <div className="h-screen w-screen bg-[#0f0f0f] text-[#e0e0e0] relative overflow-hidden font-sans">
            {children}
        </div>
    );
};

export default AppLayout;
