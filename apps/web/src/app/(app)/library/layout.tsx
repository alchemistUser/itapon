// SPDX-License-Identifier: AGPL-3.0-or-later
import { LangProvider } from "@/components/library/lang";

export default function LibraryLayout({ children }: LayoutProps<"/library">) {
  return <LangProvider>{children}</LangProvider>;
}
