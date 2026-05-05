'use client';

import { Separator } from '@/components/ui/separator';
import { AppConfig } from '@/config/app';
import { motion } from 'framer-motion';
import { Facebook, Github, Instagram, Linkedin, Mail, MapPin, Phone, Twitter } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface FooterLink {
  label: string;
  href: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

const footerSections: FooterSection[] = [
  {
    title: 'Platform',
    links: [
      { label: 'Marketplace', href: '/marketplace' },
      { label: 'Asset Evaluations', href: '/asset-evaluations' },
      { label: 'Investments', href: '/investments' },
      { label: 'Community', href: '/blog' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', href: '/about' },
      { label: 'Careers', href: '#' },
      { label: 'Blog', href: '/blog' },
      { label: 'Press', href: '#' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: 'https://docs.tigerpalacepro.com' },
      { label: 'API Reference', href: '#' },
      { label: 'Support Center', href: '#' },
      { label: 'FAQ', href: '/docs/faq' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
      { label: 'Cookie Policy', href: '#' },
      { label: 'Compliance', href: '#' },
    ],
  },
];

const socialLinks = [
  { icon: Twitter, href: 'https://twitter.com/tigerpalacepro', label: 'Twitter' },
  { icon: Linkedin, href: 'https://linkedin.com/company/tigerpalacepro', label: 'LinkedIn' },
  { icon: Instagram, href: 'https://instagram.com/tigerpalacepro', label: 'Instagram' },
  { icon: Github, href: 'https://github.com/tigerpalacepro', label: 'GitHub' },
  { icon: Facebook, href: 'https://facebook.com/tigerpalacepro', label: 'Facebook' },
];

const contactInfo = [
  { icon: Mail, label: 'Email', value: 'support@tokenizin.com', href: 'mailto:support@tokenizin.com' },
  { icon: Phone, label: 'Phone', value: '+6281353771327', href: 'tel:+6281353771327' },
  { icon: MapPin, label: 'Address', value: 'Bali, Indonesia', href: '#' },
];

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

const linkVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
    },
  },
  hover: {
    x: 5,
    transition: {
      duration: 0.2,
    },
  },
};

const socialIconVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
    },
  },
  hover: {
    scale: 1.15,
    rotate: 5,
    transition: {
      duration: 0.2,
    },
  },
  tap: {
    scale: 0.95,
  },
};

export function Footer() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true, amount: 0.2 }}
      className="relative mt-20 bg-card dark:bg-gray-900 border-t border-border dark:border-gray-800 pt-16 pb-8"
    >
      {/* Decorative top border accent with animation */}
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.1 }}
        viewport={{ once: true }}
        className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0 origin-left"
      />

      <div className="container mx-auto px-4 md:px-6 max-w-7xl">
        {/* Main Footer Content */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-12"
        >
          {/* Brand Section */}
          <motion.div className="lg:col-span-2">
            <div className="mb-6">
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="text-2xl font-bold luxury-heading text-foreground dark:text-white mb-2"
              >
                {AppConfig.siteName}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
                className="text-sm luxury-text text-muted-foreground dark:text-gray-400 leading-relaxed"
              >
                Revolutionizing real estate investment through tokenization, blockchain technology, and intelligent asset management.
              </motion.p>
            </div>

            {/* Contact Information with Popover-like Interaction */}
            <motion.div className="space-y-3 mt-6">
              {contactInfo.map((info, index) => {
                const Icon = info.icon;
                return (
                  <motion.a
                    key={info.label}
                    href={info.href}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    whileHover={{ x: 5 }}
                    className="flex items-start gap-3 text-sm text-muted-foreground dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors group"
                  >
                    <motion.div
                      whileHover={{ scale: 1.2, rotate: 10 }}
                      className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary/60 group-hover:text-primary transition-colors"
                    >
                      <Icon className="h-4 w-4" />
                    </motion.div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground dark:text-gray-500 uppercase tracking-wide">
                        {info.label}
                      </p>
                      <p className="text-sm text-foreground dark:text-gray-300">{info.value}</p>
                    </div>
                  </motion.a>
                );
              })}
            </motion.div>
          </motion.div>

          {/* Footer Links Sections with Stagger Animation */}
          {footerSections.map((section, sectionIndex) => (
            <motion.div
              key={section.title}
              className="flex flex-col"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: sectionIndex * 0.05 }}
              viewport={{ once: true }}
            >
              <motion.h3
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: sectionIndex * 0.05 }}
                viewport={{ once: true }}
                className="font-semibold text-foreground dark:text-white mb-4 luxury-heading"
              >
                {section.title}
              </motion.h3>
              <nav className="flex flex-col space-y-3">
                {section.links.map((link, linkIndex) => (
                  <motion.div key={`${section.title}-${linkIndex}`} variants={linkVariants} custom={linkIndex}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors duration-200 relative group"
                    >
                      <motion.span
                        className="relative inline-block"
                        whileHover={{ x: 4 }}
                        transition={{ duration: 0.2 }}
                      >
                        {link.label}
                        <motion.span
                          layoutId={`underline-${section.title}-${linkIndex}`}
                          className="absolute bottom-0 left-0 h-0.5 bg-primary"
                          initial={{ width: 0 }}
                          whileHover={{ width: '100%' }}
                          transition={{ duration: 0.3 }}
                        />
                      </motion.span>
                    </Link>
                  </motion.div>
                ))}
              </nav>
            </motion.div>
          ))}
        </motion.div>

        {/* Divider with Animation */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
          className="origin-left"
        >
          <Separator className="my-8 bg-border dark:bg-gray-800" />
        </motion.div>

        {/* Bottom Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row items-center justify-between gap-8"
        >
          {/* Copyright */}
          <div className="text-center md:text-left">
            <p className="text-sm text-muted-foreground dark:text-gray-400">
              © {currentYear} {AppConfig.siteName}. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground/60 dark:text-gray-500 mt-1">
              Empowering real estate investment through innovation
            </p>
          </div>

          {/* Social Links with Interactive Animations */}
          <motion.div
            className="flex items-center gap-4"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
          >
            {socialLinks.map((social) => {
              const Icon = social.icon;
              return (
                <motion.a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  variants={socialIconVariants}
                  whileHover="hover"
                  whileTap="tap"
                  className="w-10 h-10 rounded-full bg-muted dark:bg-gray-800 text-muted-foreground dark:text-gray-400 hover:bg-primary hover:text-white dark:hover:bg-primary dark:hover:text-white transition-all duration-200 flex items-center justify-center group shadow-sm hover:shadow-md"
                >
                  <Icon className="h-5 w-5" />
                </motion.a>
              );
            })}
          </motion.div>

          {/* Additional Links */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground dark:text-gray-400">
            <motion.div whileHover={{ x: 2 }} transition={{ duration: 0.2 }}>
              <Link href="#" className="hover:text-primary dark:hover:text-primary transition-colors">
                Sitemap
              </Link>
            </motion.div>
            <span>•</span>
            <motion.div whileHover={{ x: 2 }} transition={{ duration: 0.2 }}>
              <Link href="#" className="hover:text-primary dark:hover:text-primary transition-colors">
                Status
              </Link>
            </motion.div>
            <span>•</span>
            <motion.div whileHover={{ x: 2 }} transition={{ duration: 0.2 }}>
              <Link href="#" className="hover:text-primary dark:hover:text-primary transition-colors">
                Security
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Brand Tagline with Fade Animation */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          viewport={{ once: true }}
          className="text-center mt-8 pt-6 border-t border-border/50 dark:border-gray-800/50"
        >
          <p className="text-xs text-muted-foreground/70 dark:text-gray-500 tracking-wide uppercase">
            Transforming Real Estate Investment Through Technology
          </p>
        </motion.div>
      </div>
    </motion.footer>
  );
}
