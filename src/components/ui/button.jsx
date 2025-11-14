import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import React from 'react';

const buttonVariants = cva(
	'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
	{
		variants: {
			variant: {
				// رئيسي: سماوي مشبع مع نص أبيض — يتماشى مع بقية الواجهة (كان gradient sky/cyan)
				default: 'bg-sky-600 text-white hover:bg-sky-700',

				// مدمّر / خطر: أحمر واضح مع نص أبيض
				destructive: 'bg-rose-600 text-white hover:bg-rose-700',

				// مخطط: حدود رقيقة ومحايدة، خلفية بيضاء، تمييز عند hover
				outline: 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50',

				// ثانوي: خلفية خفيفة محايدة مع نص داكن
				secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200',

				// شبح: خلفية شفافة مع تفاعل خفيف
				ghost: 'bg-transparent hover:bg-slate-100 text-slate-800',

				// رابط: سماوي للروابط، مع underline عند hover
				link: 'text-sky-600 underline-offset-4 hover:underline',
			},
			size: {
				default: 'h-10 px-4 py-2',
				sm: 'h-9 rounded-md px-3',
				lg: 'h-11 rounded-md px-8',
				icon: 'h-10 w-10',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	},
);

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
	const Comp = asChild ? Slot : 'button';
	return (
		<Comp
			className={cn(buttonVariants({ variant, size, className }))}
			ref={ref}
			{...props}
		/>
	);
});
Button.displayName = 'Button';

export { Button, buttonVariants };
