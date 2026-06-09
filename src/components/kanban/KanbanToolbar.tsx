/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import KanbanSearchControls, { KanbanSearchControlsProps } from "./KanbanSearchControls";

export type KanbanToolbarProps = KanbanSearchControlsProps;

export default function KanbanToolbar(props: KanbanToolbarProps) {
  return <KanbanSearchControls variant="standalone" {...props} />;
}
