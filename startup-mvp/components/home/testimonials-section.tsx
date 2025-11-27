// ============================================
// File: src/components/home/testimonials-section.tsx
// Testimonials Section Component
// ============================================

"use client";

import React from "react";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FiStar } from "react-icons/fi";

const TestimonialsSection = () => {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true });

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "CEO, TechStartup",
      content: "This template saved us months of development time. The code quality is exceptional and everything just works out of the box.",
      rating: 5,
      initials: "SJ",
    },
    {
      name: "Michael Chen",
      role: "Founder, AppLab",
      content: "Best startup template I've ever used. The authentication system and dashboard are production-ready and highly customizable.",
      rating: 5,
      initials: "MC",
    },
    {
      name: "Emily Rodriguez",
      role: "CTO, InnovateCo",
      content: "The TypeScript implementation and modern architecture make this template stand out. Highly recommend for any serious project.",
      rating: 5,
      initials: "ER",
    },
  ];

  return (
    <section ref={ref} className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Loved by Founders
          </h2>
          <p className="text-lg text-muted-foreground">
            See what our customers have to say about their experience.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex gap-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <FiStar key={i} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground">{`"${testimonial.content}"`}</p>
                  <div className="flex items-center gap-3 pt-4">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {testimonial.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;


