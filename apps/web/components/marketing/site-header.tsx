"use client";

import Link from "next/link";
import { CalendarPlus, LayoutDashboard } from "lucide-react";

import PlanifyLogo from "@/components/planify-logo";
import { buttonVariants } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

const productLinks = [
  {
    title: "Create schedule",
    description: "Turn a goal into a day-by-day plan.",
    href: "/new/schedule",
    Icon: CalendarPlus,
  },
  {
    title: "Timeline",
    description: "Review every plan you have created.",
    href: "/view/schedules",
    Icon: LayoutDashboard,
  },
];

/**
 * Marketing header. Client component because Base UI's Navigation Menu is
 * interactive; every link inside it renders through next/link so navigation
 * stays client-side.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-5 sm:px-8 lg:px-10">
        <Link
          href="/"
          aria-label="Planify home"
          className="flex shrink-0 items-center gap-2.5"
        >
          <PlanifyLogo />
          <span className="text-lg font-semibold tracking-tight">Planify</span>
        </Link>

        <NavigationMenu className="hidden max-w-none flex-1 justify-start md:flex">
          <NavigationMenuList className="justify-start">
            <NavigationMenuItem>
              <NavigationMenuTrigger>Product</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-64 gap-1 sm:grid-rows-2">
                  {productLinks.map(({ title, description, href, Icon }) => (
                    <li key={href}>
                      <NavigationMenuLink
                        href={href}
                        render={<Link href={href} />}
                        closeOnClick
                        className="items-start gap-2.5"
                      >
                        <Icon
                          aria-hidden
                          className="mt-0.5 size-4 shrink-0 text-primary"
                        />
                        <span className="grid gap-0.5">
                          <span className="font-medium text-foreground">
                            {title}
                          </span>
                        </span>
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink
                href="/#how-it-works"
                render={<Link href="/#how-it-works" />}
                className="h-9 px-2.5 font-medium"
              >
                How it works
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Link
            href="/sign-in"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "px-4",
            )}
          >
            Log in
          </Link>
          <Link
            href="/view/schedules"
            className={cn(buttonVariants({ size: "lg" }), "px-4")}
          >
            Try it
          </Link>
        </div>
      </div>
    </header>
  );
}
