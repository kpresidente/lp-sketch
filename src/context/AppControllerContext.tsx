import { createContext, useContext, type ParentProps } from 'solid-js'
import type { AppSidebarProps } from '../components/sidebar/types'

const AppControllerContext = createContext<AppSidebarProps>()

interface AppControllerProviderProps extends ParentProps {
  value: AppSidebarProps
}

export function AppControllerProvider(props: AppControllerProviderProps) {
  return (
    <AppControllerContext.Provider value={props.value}>
      {props.children}
    </AppControllerContext.Provider>
  )
}

export function useAppController() {
  const context = useContext(AppControllerContext)
  if (!context) {
    throw new Error('useAppController must be used within an AppControllerProvider.')
  }
  return context
}
