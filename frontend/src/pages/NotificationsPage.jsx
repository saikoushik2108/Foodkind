import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellRing, CheckCheck } from 'lucide-react';
import { notificationApi } from '../api/resources.js';
import { useApi, usePagination } from '../hooks/useApi.js';
import { useToast } from '../context/ToastContext.jsx';
import {
  Alert,
  Button,
  Card,
  CardHeader,
  EmptyState,
  LoadingBlock,
  PageHeader,
  Pagination,
  Tabs,
  formatDate,
  formatRelative,
  humanize,
} from '../components/ui.jsx';

const idOf = (record) => record?.id || record?._id;

/** Notification centre: operational events for the signed-in user. */
export function NotificationsPage() {
  const toast = useToast();
  const { pagination, setPage } = usePagination({ page: 1, limit: 20 });
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(false);

  const { data, error, loading, reload } = useApi(
    () =>
      notificationApi.list({
        page: pagination.page,
        limit: pagination.limit,
        ...(filter === 'unread' ? { unread: 'true' } : {}),
      }),
    [pagination.page, pagination.limit, filter]
  );

  const unreadCount = (data?.items || []).filter((notification) => !notification.readAt).length;

  async function markRead(notification) {
    if (notification.readAt) return;
    try {
      await notificationApi.markRead(idOf(notification));
      reload();
    } catch (err) {
      toast.error(err.message, { title: 'Could not mark as read' });
    }
  }

  async function markAll() {
    setBusy(true);
    try {
      await notificationApi.markAllRead();
      toast.success('All notifications marked as read.');
      reload();
    } catch (err) {
      toast.error(err.message, { title: 'Could not mark all as read' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Notifications"
        subtitle="Reservations, pickups, handover codes, delivery confirmations, and verification decisions."
        actions={
          <Button variant="secondary" icon={CheckCheck} onClick={markAll} loading={busy} disabled={!unreadCount}>
            Mark all as read
          </Button>
        }
      />

      {error ? (
        <Alert variant="danger" title="Notifications could not be loaded">
          {error.message}
        </Alert>
      ) : null}

      <Card>
        <CardHeader
          title={`${data?.pagination?.total ?? 0} notification${data?.pagination?.total === 1 ? '' : 's'}`}
          subtitle={unreadCount ? `${unreadCount} unread on this page.` : 'Nothing unread on this page.'}
          action={
            <Tabs
              tabs={[
                { value: 'all', label: 'All' },
                { value: 'unread', label: 'Unread' },
              ]}
              active={filter}
              onChange={(value) => {
                setFilter(value);
                setPage(1);
              }}
            />
          }
        />

        {loading ? (
          <div className="card-body">
            <LoadingBlock label="Loading notifications…" />
          </div>
        ) : data?.items?.length ? (
          <>
            <div style={{ padding: 0 }}>
              {data.items.map((notification) => (
                <article
                  key={idOf(notification)}
                  className={`notification-row ${notification.readAt ? '' : 'notification-unread'}`}
                >
                  {notification.readAt ? (
                    <span style={{ width: 8, flexShrink: 0 }} aria-hidden="true" />
                  ) : (
                    <span className="notification-dot" aria-hidden="true" />
                  )}

                  <div className="grow stack-sm">
                    <div className="spread">
                      <strong className="small">{notification.title}</strong>
                      <span className="tiny muted nowrap">
                        {formatRelative(notification.createdAt)}
                        {notification.readAt ? '' : ' · unread'}
                      </span>
                    </div>

                    <p className="small muted" style={{ margin: 0 }}>
                      {notification.message}
                    </p>

                    <div className="row-wrap tiny muted">
                      <span>{humanize(notification.event)}</span>
                      <span>{formatDate(notification.createdAt, { withTime: true })}</span>
                      {notification.emailStatus && notification.emailStatus !== 'SKIPPED' ? (
                        <span>email: {notification.emailStatus.toLowerCase()}</span>
                      ) : null}
                    </div>

                    <div className="row-wrap">
                      {notification.link ? (
                        <Link to={notification.link} className="btn btn-secondary btn-sm" onClick={() => markRead(notification)}>
                          Open
                        </Link>
                      ) : null}
                      {!notification.readAt ? (
                        <Button size="sm" variant="ghost" onClick={() => markRead(notification)}>
                          Mark as read
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {data.pagination ? (
              <div className="card-body">
                <Pagination
                  page={data.pagination.page}
                  totalPages={data.pagination.totalPages}
                  total={data.pagination.total}
                  limit={data.pagination.limit}
                  onPageChange={setPage}
                />
              </div>
            ) : null}
          </>
        ) : (
          <div className="card-body">
            <EmptyState
              icon={filter === 'unread' ? BellRing : Bell}
              title={filter === 'unread' ? 'You are all caught up' : 'No notifications yet'}
              description={
                filter === 'unread'
                  ? 'Every notification on this page has been read.'
                  : 'You will be notified when a reservation is made or accepted, when a pickup is arranged or delayed, when a handover code is issued, and when a delivery is confirmed.'
              }
              action={
                filter === 'unread' ? (
                  <Button variant="secondary" onClick={() => setFilter('all')}>
                    Show all notifications
                  </Button>
                ) : null
              }
            />
          </div>
        )}
      </Card>
    </div>
  );
}

export default NotificationsPage;
