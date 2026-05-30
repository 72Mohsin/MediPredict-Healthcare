// qrcode package not included — stub component
export function QRCodeDataURL({ value }: { value: string }) {
  return <div className="text-xs text-muted-foreground p-2 border rounded">[QR: {value}]</div>;
}
