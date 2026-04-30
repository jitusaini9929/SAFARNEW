import React, { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import WishForm from "./WishForm";
import PublicWishWall from "./PublicWishWall";

type BirthdayWishBoxModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: "write" | "view";
  onRequestSignIn?: () => void;
  onWishSubmitted?: () => void;
};

const BirthdayWishBoxModal: React.FC<BirthdayWishBoxModalProps> = ({
  open,
  onOpenChange,
  initialTab = "write",
  onRequestSignIn,
  onWishSubmitted,
}) => {
  const [activeTab, setActiveTab] = useState<"write" | "view">(initialTab);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/72 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:duration-150 data-[state=open]:duration-200" />
        <DialogPrimitive.Content className="fixed inset-0 z-50 overflow-hidden bg-transparent p-0 outline-none">
          <DialogPrimitive.Title className="sr-only">Birthday Wish Box</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Share one heartfelt birthday wish.
          </DialogPrimitive.Description>

          <DialogPrimitive.Close className="absolute right-5 top-5 z-[80] inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-slate-950/35 text-white/80 backdrop-blur-md transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-purple-200">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>

          {activeTab === "write" ? (
            <WishForm onRequestSignIn={onRequestSignIn} onSubmitted={onWishSubmitted} />
          ) : (
            <div className="mx-auto flex h-[100dvh] w-full max-w-3xl items-center px-4 py-20">
              <div className="flex max-h-[calc(100dvh-10rem)] w-full flex-col rounded-2xl border border-white/10 bg-slate-950/45 p-5 text-white shadow-2xl backdrop-blur-md">
                <div className="mb-4 flex shrink-0 items-center justify-between gap-4">
                  <h2 className="font-playfair text-2xl font-black">Birthday Wishes</h2>
                  <button
                    type="button"
                    className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
                    onClick={() => setActiveTab("write")}
                  >
                    Write Wish
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto pr-2">
                  <PublicWishWall active={open && activeTab === "view"} />
                </div>
              </div>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default BirthdayWishBoxModal;
