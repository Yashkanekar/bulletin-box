import FeedList from '@/components/FeedList'

export default function HomePage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">📰 Offline News Reader</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Browse &amp; cache articles for offline reading. Summaries coming soon!
        </p>
      </div>

      {/* FeedList */}
      <FeedList />
    </div>
  )
}
