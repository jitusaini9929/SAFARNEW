import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: "Is SAFAR completely free?",
    answer: "Yes, the core features of SAFAR including the focus timer, Mehfil community, and basic tracking are completely free. We believe every student should have access to premium productivity tools."
  },
  {
    question: "What is the 100K Discipline Challenge?",
    answer: "It's a massive community-driven challenge where thousands of students commit to building a daily routine of deep work, mindfulness, and unbreakable discipline. It's the ultimate reset button for your focus."
  },
  {
    question: "Do I need to download the mobile app?",
    answer: "While you can use all of SAFAR's core features directly on the web, our mobile app (Parmar Academy) provides the best experience for meditating, tracking your mood, and staying disciplined on the go."
  },
  {
    question: "How does the Focus Timer (Ekagra) work?",
    answer: "It uses scientifically proven intervals to break your study sessions into manageable chunks—typically 25 minutes of absolute deep work followed by a 5-minute mindful break to prevent burnout."
  }
];

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="bg-horizon-surface dark:bg-horizon-surface px-4 md:px-12 py-16 md:py-24 relative z-10">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-4xl md:text-6xl font-playfair font-extrabold text-forest dark:text-white mb-6 tracking-tighter">
            Curious Minds Ask
          </h2>
          <p className="text-lg md:text-xl text-road/70 dark:text-white/60 font-inter font-medium max-w-2xl mx-auto">
            Everything you need to know about the SAFAR ecosystem and how it transforms your study routine.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <motion.div
                key={index}
                initial={false}
                className={`${isOpen ? 'tonal-container-high shadow-2xl shadow-forest/5' : 'tonal-container-low'} rounded-2xl overflow-hidden transition-all duration-500`}
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full flex items-center justify-between p-5 md:p-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                >
                  <span className="font-inter font-bold text-forest dark:text-white text-lg md:text-xl pr-8">
                    {faq.question}
                  </span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="flex-shrink-0 text-solar"
                  >
                    <ChevronDown className="w-6 h-6 md:w-7 md:h-7" />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <div className="px-5 pb-5 md:px-8 md:pb-8 text-road/80 dark:text-white/70 font-inter font-medium leading-relaxed text-base md:text-lg pt-4">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
