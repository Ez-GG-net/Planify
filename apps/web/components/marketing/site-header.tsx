"use client";

import Link from "next/link";
import { ArrowRight, CalendarPlus, ChevronDownIcon, LayoutDashboard } from "lucide-react";

import PlanifyLogo from "@/components/planify-logo";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLinkItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
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
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(navigationMenuTriggerStyle(), "group", "gap-0")}
                >
                  Product
                  <ChevronDownIcon
                    aria-hidden="true"
                    className="relative top-px ml-1 size-3 transition duration-300 group-data-popup-open:rotate-180"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-auto min-w-56">
                  {productLinks.map(({ title, description, href, Icon }) => (
                    <DropdownMenuLinkItem
                      key={href}
                      href={href}
                      render={<Link href={href} />}
                      closeOnClick
                      className="gap-2.5 py-1.5"
                    >
                      <Icon
                        aria-hidden
                        className="size-4 shrink-0 text-muted-foreground"
                      />
                      <span className="grid gap-0.5">
                        <span className="font-medium text-foreground">
                          {title}
                        </span>
                      </span>
                    </DropdownMenuLinkItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
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
            Start planning <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
