"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "!bg-background !border-secondary-color !border-2 !text-white !p-5 !gap-3",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-6 text-green-500" />,
        info: <InfoIcon className="size-6 text-blue-500" />,
        warning: <TriangleAlertIcon className="size-6 text-yellow-500" />,
        error: <OctagonXIcon className="size-6 text-red-600" />,
        loading: <Loader2Icon className="size-6 animate-spin" />,
      }}
      {...props}
    />
  );
};

export { Toaster };
