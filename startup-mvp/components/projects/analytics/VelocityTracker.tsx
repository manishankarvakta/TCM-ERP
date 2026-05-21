"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity } from "lucide-react";

interface VelocityTrackerProps {
    data: { name: string; velocity: number }[];
}

export default function VelocityTracker({ data }: VelocityTrackerProps) {
    return (
        <Card className="shadow-sm border-border/50 col-span-1 md:col-span-2">
            <CardHeader className="bg-slate-50/50 border-b py-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Sprint Velocity (Last 4 Weeks)
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                    Visualizes the total estimated effort successfully completed per week.
                </p>
            </CardHeader>
            <CardContent className="p-6 h-[300px]">
                {data.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground italic">
                        Not enough historical data to map velocity.
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 12, fill: '#6b7280' }} 
                                dy={10} 
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 12, fill: '#6b7280' }} 
                            />
                            <Tooltip 
                                cursor={{ fill: '#f3f4f6' }}
                                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar 
                                dataKey="velocity" 
                                fill="#3b82f6" 
                                radius={[4, 4, 0, 0]} 
                                barSize={40}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
