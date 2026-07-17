import { PHONE_HREF, PHONE_NUMBER } from "../data/contact";
import { PhoneIcon } from "./icons";

export default function FloatingCallButton() {
  return (
    <a
      href={PHONE_HREF}
      aria-label={`전화 문의 ${PHONE_NUMBER}`}
      className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-navy-950 shadow-lg shadow-black/30 transition-transform hover:scale-105 active:scale-95 md:hidden"
    >
      <PhoneIcon className="h-7 w-7" />
    </a>
  );
}
