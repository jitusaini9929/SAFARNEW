import React from 'react';
import { UserPlus } from 'lucide-react';

const RightSidebar = () => {
    const updates = [
        {
            id: 1,
            image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=150&h=150&fit=crop",
            title: "New Study Cafe Open",
            desc: "The engineering block just opened a 24/7 cafe...",
            link: "#"
        },
        {
            id: 2,
            image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=150&h=150&fit=crop",
            title: "Scholarship Portal Live",
            desc: "Applications for fall semester grants are now...",
            link: "#"
        }
    ];

    const contributors = [
        {
            id: 1,
            name: "John Style",
            role: "CEO Cosmos",
            image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"
        },
        {
            id: 2,
            name: "Rita Kane",
            role: "Fashion Designer",
            image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"
        },
        {
            id: 3,
            name: "Ken Adams",
            role: "Social Worker",
            image: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop"
        }
    ];

    return (
        <aside className="hidden xl:flex flex-col gap-6 w-80 shrink-0 sticky top-28 h-fit">
            {/* Top Contributors */}
            <div className="glass-card rounded-3xl p-5">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xs font-black text-foreground uppercase tracking-widest">Top Contributors</h2>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10">
                        <div className="flex h-1.5 w-1.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                        </div>
                        <span className="text-[9px] text-primary font-bold">Live</span>
                    </div>
                </div>
                <div className="space-y-4">
                    {contributors.map(user => (
                        <div key={user.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-muted overflow-hidden">
                                    <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-foreground">{user.name}</p>
                                    <p className="text-[9px] text-muted-foreground">{user.role}</p>
                                </div>
                            </div>
                            <button className="p-1.5 rounded-lg glass-button hover:text-primary transition-colors">
                                <UserPlus className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
                <button className="w-full mt-5 glass-button py-2.5 text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors">
                    Discover More
                </button>
            </div>
        </aside>
    );
};

export default RightSidebar;
