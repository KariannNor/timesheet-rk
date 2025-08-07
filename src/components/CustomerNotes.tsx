import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, ExternalLink } from 'lucide-react'
import { notesService, type CustomerNote, supabase } from '../lib/supabase'

interface CustomerNotesProps {
  organizationId: string
  isReadOnly: boolean
}

const CustomerNotes = ({ organizationId, isReadOnly }: CustomerNotesProps) => {
  const [notes, setNotes] = useState<CustomerNote[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  
  // Form states
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newUrl, setNewUrl] = useState('')

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true)
      const data = await notesService.getNotes(organizationId)
      setNotes(data)
    } catch (error) {
      console.error('Error loading notes:', error)
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newContent.trim()) return

    // Debug bruker og e-post
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Current user:', user);
    console.log('User email:', user?.email);

    if (!user) {
      alert('Du er ikke logget inn');
      return;
    }

    try {
      console.log('Attempting to save note...', { organizationId, newTitle, newContent, newUrl });
      await notesService.addNote(organizationId, newTitle, newContent, newUrl)
      setNewTitle('')
      setNewContent('')
      setNewUrl('')
      setShowAddForm(false)
      loadNotes()
    } catch (error) {
      console.error('Error adding note:', error)
      
      // Proper error handling
      const errorMessage = error instanceof Error ? error.message : 'Ukjent feil oppstod'
      console.error('Error details:', error);
      alert('Feil ved lagring av notat: ' + errorMessage)
    }
  } 

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Er du sikker på at du vil slette dette notatet?')) return

    try {
      await notesService.deleteNote(noteId)
      loadNotes()
    } catch (error) {
      console.error('Error deleting note:', error)
      alert('Feil ved sletting av notat')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('no-NO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">Kundenotater</h3>
        {!isReadOnly && (
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            Nytt notat
          </button>
        )}
      </div>

      {/* Add Note Form */}
      {showAddForm && !isReadOnly && (
        <form onSubmit={handleAddNote} className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="space-y-3">
            <div>
              <input
                type="text"
                placeholder="Tittel (valgfritt)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <textarea
                placeholder="Notatinnhold..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                required
              />
            </div>
            <div>
              <input
                type="url"
                placeholder="Lenke (valgfritt) - f.eks. til miljø, møtenotater"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                Lagre notat
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setNewTitle('')
                  setNewContent('')
                  setNewUrl('')
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm"
              >
                Avbryt
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Ingen notater ennå.</p>
          {!isReadOnly && (
            <p className="text-sm mt-1">Klikk "Nytt notat" for å legge til viktige detaljer.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <div key={note.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  {note.title && (
                    <h4 className="font-medium text-gray-900 mb-1">{note.title}</h4>
                  )}
                  <p className="text-gray-700 text-sm whitespace-pre-wrap">{note.content}</p>
                  {note.url && (
                    <a
                      href={note.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm mt-2"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Åpne lenke
                    </a>
                  )}
                </div>
                {!isReadOnly && (
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Slett notat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {formatDate(note.created_at)}
                {note.updated_at !== note.created_at && ' (redigert)'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CustomerNotes