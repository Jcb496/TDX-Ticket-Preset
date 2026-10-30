TDX Presets 3.0.2 diagnostic fix

Preserves /TDWorkManagement/ URL. Runs in matching frames and waits for ticket fields. Adds page-world jQuery event bridge.

INSTALL: Copy files into your existing extension folder, replacing matching files. In chrome://extensions click Reload, then refresh the ticket page. Keep original project backup.

If toolbar does not appear, the ticket fields may be in an unmatched iframe; inspect iframe URL and extension console. If toolbar appears but fields are missing, send console logs. Test on a non-critical ticket.

Remote preset URL must still be configured through options; this package does not publish store updates.
