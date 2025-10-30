import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { MOCK_ARTIFACTS } from './mock-data';

export function ArtifactTable() {
  return (
    <div
      className="rounded-lg border"
      style={{
        backgroundColor: 'var(--color-prism-bg-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <h4
          className="font-['Bebas_Neue',sans-serif] uppercase tracking-wide"
          style={{ color: 'var(--color-prism-text-primary)' }}
        >
          Artefacts
        </h4>
        <div className="flex items-center gap-2 text-xs">
          <span style={{ color: 'var(--color-prism-text-secondary)' }}>
            Storage used
          </span>
          <div className="h-2 w-28 overflow-hidden rounded-full bg-[var(--color-prism-bg-canvas)]">
            <div
              className="h-full"
              style={{
                width: '72%',
                background: 'var(--color-prism-warning)',
              }}
            />
          </div>
          <span
            className="text-xs"
            style={{ color: 'var(--color-prism-warning)' }}
          >
            72%
          </span>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Age</TableHead>
            <TableHead>SHA</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {MOCK_ARTIFACTS.map((artifact) => (
            <TableRow key={artifact.name}>
              <TableCell className="font-mono text-xs text-[var(--color-prism-text-primary)]">
                {artifact.name}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {artifact.type}
                </Badge>
              </TableCell>
              <TableCell>{artifact.size}</TableCell>
              <TableCell>{artifact.age}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {artifact.sha}
              </TableCell>
              <TableCell className="space-x-2 text-right">
                <Button size="sm" variant="ghost">
                  Copy
                </Button>
                <Button size="sm" variant="ghost">
                  Download
                </Button>
                {artifact.status === 'soft-deleted' ? (
                  <Button size="sm" variant="outline">
                    Restore
                  </Button>
                ) : artifact.status === 'missing' ? (
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: 'var(--color-prism-warning)',
                      color: 'var(--color-prism-warning)',
                    }}
                  >
                    Not generated
                  </Badge>
                ) : (
                  <Button size="sm" variant="ghost">
                    Delete
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
