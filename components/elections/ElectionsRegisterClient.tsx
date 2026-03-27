"use client";

import { RegistrationWizard } from "./RegistrationWizard";

interface Props {
  type: "voter" | "candidate";
  defaultFullName: string;
  defaultPhone: string;
  defaultPatronymic?: string;
  defaultPassportNumber?: string;
  defaultDocumentNumber?: string;
  resumePayment?: boolean;
}

export function ElectionsRegisterClient({ type, defaultFullName, defaultPhone, defaultPatronymic, defaultPassportNumber, defaultDocumentNumber, resumePayment }: Props) {
  return <RegistrationWizard type={type} defaultFullName={defaultFullName} defaultPhone={defaultPhone} defaultPatronymic={defaultPatronymic} defaultPassportNumber={defaultPassportNumber} defaultDocumentNumber={defaultDocumentNumber} resumePayment={resumePayment} />;
}
