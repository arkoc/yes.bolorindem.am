"use client";

import { RegistrationWizard } from "./RegistrationWizard";

interface Props {
  type: "voter" | "candidate";
  defaultFullName: string;
  defaultPhone: string;
  resumePayment?: boolean;
}

export function ElectionsRegisterClient({ type, defaultFullName, defaultPhone, resumePayment }: Props) {
  return <RegistrationWizard type={type} defaultFullName={defaultFullName} defaultPhone={defaultPhone} resumePayment={resumePayment} />;
}
