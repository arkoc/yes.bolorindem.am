"use client";

import { RegistrationWizard } from "./RegistrationWizard";

interface Props {
  type: "voter" | "candidate";
  defaultFullName: string;
  defaultPhone: string;
  defaultPatronymic?: string;
  defaultPassportNumber?: string;
  resumePayment?: boolean;
}

export function ElectionsRegisterClient({ type, defaultFullName, defaultPhone, defaultPatronymic, defaultPassportNumber, resumePayment }: Props) {
  return <RegistrationWizard type={type} defaultFullName={defaultFullName} defaultPhone={defaultPhone} defaultPatronymic={defaultPatronymic} defaultPassportNumber={defaultPassportNumber} resumePayment={resumePayment} />;
}
