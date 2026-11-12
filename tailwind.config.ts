
import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				'surface-inverse': 'hsl(var(--surface-inverse))',
				'surface-2': 'hsl(var(--surface-2))',
				'primary-ink': 'hsl(var(--primary-ink))',
				'destructive-ink': 'hsl(var(--destructive-ink))',
				success: {
					DEFAULT: 'hsl(var(--success))',
					ink: 'hsl(var(--success-ink))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					ink: 'hsl(var(--warning-ink))'
				},
				info: {
					DEFAULT: 'hsl(var(--info))',
					ink: 'hsl(var(--info-ink))'
				},
				sport: {
					run: 'hsl(var(--sport-run))',
					bike: 'hsl(var(--sport-bike))',
					swim: 'hsl(var(--sport-swim))',
					strength: 'hsl(var(--sport-strength))',
					other: 'hsl(var(--sport-other))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'slide-up': {
					'0%': { transform: 'translateY(30px)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' }
				},
				'slide-in-left': {
					'0%': { transform: 'translateX(-30px)', opacity: '0' },
					'100%': { transform: 'translateX(0)', opacity: '1' }
				},
				'slide-in-right': {
					'0%': { transform: 'translateX(30px)', opacity: '0' },
					'100%': { transform: 'translateX(0)', opacity: '1' }
				},
				'scale-in': {
					'0%': { transform: 'scale(0.95)', opacity: '0' },
					'100%': { transform: 'scale(1)', opacity: '1' }
				},
				'glow': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.5' }
				},
				'float': {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-10px)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.6s ease-out forwards',
				'slide-up': 'slide-up 0.6s ease-out forwards',
				'slide-in-left': 'slide-in-left 0.6s ease-out forwards',
				'slide-in-right': 'slide-in-right 0.6s ease-out forwards',
				'scale-in': 'scale-in 0.5s ease-out forwards',
				'glow': 'glow 2s ease-in-out infinite',
				'float': 'float 3s ease-in-out infinite'
			},
			fontFamily: {
				sans: ['Inter', 'sans-serif'],
				display: ['Montserrat', 'sans-serif']
			},
			// Type scale (design system 2.1). Display/title-lg/metric-lg+ also get
			// Montserrat and metrics get tabular-nums in src/index.css.
			fontSize: {
				'display-xl': ['3.5rem', { lineHeight: '3.75rem', letterSpacing: '-0.02em', fontWeight: '800' }],
				'display-lg': ['2.5rem', { lineHeight: '2.75rem', fontWeight: '700' }],
				'display-md': ['2rem', { lineHeight: '2.375rem', fontWeight: '700' }],
				'title-lg': ['1.5rem', { lineHeight: '1.875rem', fontWeight: '700' }],
				'title-md': ['1.25rem', { lineHeight: '1.625rem', fontWeight: '600' }],
				'title-sm': ['1.0625rem', { lineHeight: '1.375rem', fontWeight: '600' }],
				'body-lg': ['1.125rem', { lineHeight: '1.75rem', fontWeight: '400' }],
				body: ['1rem', { lineHeight: '1.5rem', fontWeight: '400' }],
				'body-sm': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '400' }],
				caption: ['0.75rem', { lineHeight: '1rem', fontWeight: '500' }],
				overline: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.08em', fontWeight: '600' }],
				'metric-xl': ['3rem', { lineHeight: '3.25rem', fontWeight: '700' }],
				'metric-lg': ['2rem', { lineHeight: '2.25rem', fontWeight: '700' }],
				'metric-md': ['1.25rem', { lineHeight: '1.5rem', fontWeight: '600' }],
			},
			// Layers (design system 3): stop using z-50 for everything
			zIndex: {
				sticky: '10',
				fab: '30',
				chrome: '40',
				overlay: '50',
				toast: '100',
			},
			// Motion (design system 6.1)
			transitionDuration: {
				instant: '100ms',
				fast: '150ms',
				base: '200ms',
				moderate: '280ms',
				slow: '400ms',
			},
			transitionTimingFunction: {
				standard: 'cubic-bezier(0.2, 0, 0, 1)',
				exit: 'cubic-bezier(0.4, 0, 1, 1)',
			},
		}
	},
	plugins: [tailwindcssAnimate],
} satisfies Config;
