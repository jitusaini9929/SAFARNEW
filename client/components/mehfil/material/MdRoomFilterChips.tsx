import type { MehfilFeedRoom } from '../MehfilRoomFilter';
import { MdChipSetReact, MdFilterChipReact } from './MdComponents';

type MdRoomFilterChipsProps = {
  activeRoom: MehfilFeedRoom;
  rooms: MehfilFeedRoom[];
  labels: Record<MehfilFeedRoom, string>;
  tabActiveClass: string;
  tabIdleClass: string;
  onSelect: (room: MehfilFeedRoom) => void;
};

export function MdRoomFilterChips({
  activeRoom,
  rooms,
  labels,
  tabActiveClass,
  tabIdleClass,
  onSelect,
}: MdRoomFilterChipsProps) {
  return (
    <MdChipSetReact aria-label="Feed filters">
      {rooms.map((room) => {
        const selected = room === activeRoom;
        return (
          <MdFilterChipReact
            key={room}
            label={labels[room]}
            selected={selected}
            className={
              selected
                ? `mehfil-room-chip-active ${tabActiveClass}`
                : `mehfil-room-chip-idle ${tabIdleClass}`
            }
            onClick={() => onSelect(room)}
          />
        );
      })}
    </MdChipSetReact>
  );
}
