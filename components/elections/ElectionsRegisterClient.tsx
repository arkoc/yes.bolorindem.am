"use client";

import { RegistrationWizard } from "./RegistrationWizard";

interface Props {
  type: "voter" | "candidate";
  defaultFullName: string;
  defaultPhone: string;
}

export function ElectionsRegisterClient({ type, defaultFullName, defaultPhone }: Props) {
  return <RegistrationWizard type={type} defaultFullName={defaultFullName} defaultPhone={defaultPhone} />;
}
