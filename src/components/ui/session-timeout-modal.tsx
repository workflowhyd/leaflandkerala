"use client";
import { Clock } from "lucide-react";
import { Modal } from "./modal";
import { Button } from "./button";

interface SessionTimeoutModalProps {
  open: boolean;
  secondsLeft: number;
  onStay: () => void;
  onLogout: () => void;
}

export function SessionTimeoutModal({
  open,
  secondsLeft,
  onStay,
  onLogout,
}: SessionTimeoutModalProps) {
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const display = mins > 0
    ? `${mins}:${String(secs).padStart(2, "0")}`
    : `${secs}s`;

  return (
    <Modal
      open={open}
      onClose={onStay}
      size="sm"
    >
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center">
          <Clock className="text-orange-500" size={28} />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-800">Session Expiring</h2>
          <p className="text-sm text-gray-500 mt-1">
            You&apos;ve been inactive. You&apos;ll be logged out in
          </p>
          <p className="text-4xl font-bold text-orange-500 mt-3 tabular-nums">
            {display}
          </p>
        </div>

        <div className="flex gap-3 w-full pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onLogout}
          >
            Logout Now
          </Button>
          <Button
            variant="success"
            className="flex-1"
            onClick={onStay}
          >
            Stay Logged In
          </Button>
        </div>
      </div>
    </Modal>
  );
}
