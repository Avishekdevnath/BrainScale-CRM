// State management
let currentTheme = 'light';
let sidebarCollapsed = false;
let currentPage = 'student-profile';

// Groups data
const groupsData = [
  {
    id: 1,
    name: 'Batch A - Fall 2025',
    color: '#3B82F6',
    program: 'Full Stack Development',
    student_count: 35,
    status: 'Active',
    created: '2025-09-15',
    team_members: ['A. Khan', 'S. Rahman'],
    conversion_rate: 28.6,
    calls_made: 42,
    pending_followups: 8
  },
  {
    id: 2,
    name: 'Enterprise Leads Q4',
    color: '#10B981',
    program: 'B2B Sales',
    student_count: 18,
    status: 'Active',
    created: '2025-10-01',
    team_members: ['I. Bari'],
    conversion_rate: 44.4,
    calls_made: 31,
    pending_followups: 3
  },
  {
    id: 3,
    name: 'Trial Users - November',
    color: '#F59E0B',
    program: 'Free Trial Conversion',
    student_count: 52,
    status: 'Active',
    created: '2025-11-01',
    team_members: ['P. Chowdhury', 'J. Alam'],
    conversion_rate: 15.4,
    calls_made: 28,
    pending_followups: 12
  },
  {
    id: 4,
    name: 'VIP Prospects',
    color: '#8B5CF6',
    program: 'Premium Program',
    student_count: 12,
    status: 'Active',
    created: '2025-10-10',
    team_members: ['A. Khan'],
    conversion_rate: 58.3,
    calls_made: 19,
    pending_followups: 2
  },
  {
    id: 5,
    name: 'Batch B - Spring 2026',
    color: '#EC4899',
    program: 'Data Science',
    student_count: 28,
    status: 'Active',
    created: '2025-10-20',
    team_members: ['S. Rahman', 'I. Bari'],
    conversion_rate: 21.4,
    calls_made: 35,
    pending_followups: 6
  },
  {
    id: 6,
    name: 'Referral Network',
    color: '#06B6D4',
    program: 'Referral Program',
    student_count: 24,
    status: 'Active',
    created: '2025-09-25',
    team_members: ['J. Alam'],
    conversion_rate: 37.5,
    calls_made: 22,
    pending_followups: 4
  },
  {
    id: 7,
    name: 'Weekend Warriors',
    color: '#84CC16',
    program: 'Part-time Learning',
    student_count: 41,
    status: 'Active',
    created: '2025-09-10',
    team_members: ['P. Chowdhury', 'A. Khan'],
    conversion_rate: 19.5,
    calls_made: 38,
    pending_followups: 9
  },
  {
    id: 8,
    name: 'Batch A - Summer 2025',
    color: '#6B7280',
    program: 'Full Stack Development',
    student_count: 22,
    status: 'Completed',
    created: '2025-06-01',
    team_members: ['S. Rahman'],
    conversion_rate: 68.2,
    calls_made: 51,
    pending_followups: 0
  },
  {
    id: 9,
    name: 'Corporate Training Batch',
    color: '#6B7280',
    program: 'Corporate',
    student_count: 8,
    status: 'Archived',
    created: '2025-07-15',
    team_members: ['I. Bari'],
    conversion_rate: 75.0,
    calls_made: 15,
    pending_followups: 0
  },
  {
    id: 10,
    name: 'Early Access Beta',
    color: '#6B7280',
    program: 'Product Launch',
    student_count: 2,
    status: 'Archived',
    created: '2025-08-01',
    team_members: ['A. Khan'],
    conversion_rate: 50.0,
    calls_made: 4,
    pending_followups: 0
  }
];

let filteredGroups = [...groupsData];
let currentView = 'grid';

// Student data
const studentData = {
  id: 'cmi2w7igt000gl2poy3sflx2h',
  name: 'Maria Lopez',
  email: 'maria.lopez@example.com',
  discordId: '@myrialopez',
  tags: [],
  phones: [{ phone: '6669995555', isPrimary: true }],
  enrollments: [
    {
      id: 'cmi2w7jr9000jl2po0oeygzls',
      groupName: 'AI/ML Batch 1',
      isActive: true,
      createdAt: '2025-11-17T08:38:44.421Z'
    }
  ],
  counts: { calls: 0, followups: 0 },
  timeline: { calls: [], followups: [] },
  createdAt: '2025-11-17T08:38:42.749Z',
  updatedAt: '2025-11-17T10:16:49.635Z'
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  initializeTheme();
  initializeSidebar();
  initializeUserMenu();
  initializeProfileTabs();
  initializeBackButton();
  initializeCopyButtons();
  animateStats();
  updateLastUpdatedTime();
});

// Profile tabs
function initializeProfileTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      
      // Remove active class from all tabs and contents
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding content
      btn.classList.add('active');
      const targetContent = document.getElementById(targetTab);
      if (targetContent) {
        targetContent.classList.add('active');
        // Smooth scroll to top of tab content
        targetContent.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      
      // Show toast for better feedback
      const tabName = targetTab.charAt(0).toUpperCase() + targetTab.slice(1);
      showToast(`Viewing ${tabName}`);
    });
  });
  
  // Initialize action buttons
  initializeActionButtons();
}

// Initialize action buttons
function initializeActionButtons() {
  // Edit Profile button
  const editBtns = document.querySelectorAll('button:not(.copy-btn):not(.tab-btn):not(.nav-item):not(.utility-item)');
  editBtns.forEach(btn => {
    if (btn.textContent.includes('Edit')) {
      btn.addEventListener('click', () => {
        showToast('🖊️ Opening edit profile...');
      });
    }
    if (btn.textContent.includes('Log Call')) {
      btn.addEventListener('click', () => {
        showToast('📞 Opening call log form...');
      });
    }
    if (btn.textContent.includes('Follow-up') || btn.textContent.includes('Create Follow-up')) {
      btn.addEventListener('click', () => {
        showToast('⏰ Creating new follow-up...');
      });
    }
    if (btn.textContent.includes('Delete')) {
      btn.addEventListener('click', () => {
        showToast('🗑️ Delete action (requires confirmation)');
      });
    }
    if (btn.textContent.includes('Add Tag') || btn.textContent.includes('Add')) {
      btn.addEventListener('click', () => {
        showToast('🏷️ Adding new tag...');
      });
    }
    if (btn.textContent.includes('Add Note')) {
      btn.addEventListener('click', () => {
        showToast('📝 Adding new note...');
      });
    }
  });
}

// Back button
function initializeBackButton() {
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      // In a real app, this would navigate back to students list
      showToast('← Navigating back to students list');
      // Simulate navigation animation
      const content = document.querySelector('.content');
      content.style.opacity = '0.5';
      setTimeout(() => {
        content.style.opacity = '1';
      }, 300);
    });
  }
}

// Initialize copy buttons
function initializeCopyButtons() {
  const copyBtns = document.querySelectorAll('.copy-btn');
  copyBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const text = btn.getAttribute('onclick').match(/copyToClipboard\('(.+?)'\)/)[1];
      copyToClipboard(text);
    });
  });
}

// Copy to clipboard
function copyToClipboard(text) {
  // Create a temporary textarea element
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  
  try {
    document.execCommand('copy');
    showToast('✓ Copied: ' + text);
  } catch (err) {
    showToast('✗ Failed to copy');
  }
  
  document.body.removeChild(textarea);
}

// Show toast notification
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  toast.textContent = message;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// Animate stats on load
function animateStats() {
  const statValues = document.querySelectorAll('.stat-value');
  statValues.forEach((stat, index) => {
    stat.style.opacity = '0';
    stat.style.transform = 'translateY(10px)';
    setTimeout(() => {
      stat.style.transition = 'all 0.4s ease';
      stat.style.opacity = '1';
      stat.style.transform = 'translateY(0)';
    }, index * 100);
  });
}

// Update last updated time
function updateLastUpdatedTime() {
  const updatedSpan = document.querySelector('.profile-updated');
  if (!updatedSpan) return;
  
  const updatedDate = new Date('2025-11-17T10:16:49.635Z');
  const now = new Date();
  const diffMs = now - updatedDate;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffHours < 24) {
    updatedSpan.textContent = `Last updated ${diffHours} hours ago`;
  } else {
    const diffDays = Math.floor(diffHours / 24);
    updatedSpan.textContent = `Last updated ${diffDays} days ago`;
  }
}

// Make functions available globally
window.copyToClipboard = copyToClipboard;
window.showToast = showToast;

// Theme management
function initializeTheme() {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  currentTheme = prefersDark ? 'dark' : 'light';
  applyTheme(currentTheme);
  
  const themeToggle = document.getElementById('themeToggle');
  themeToggle.addEventListener('click', toggleTheme);
}

function toggleTheme() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme(currentTheme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-color-scheme', theme);
}

// Sidebar management
function initializeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  
  sidebarToggle.addEventListener('click', () => {
    sidebarCollapsed = !sidebarCollapsed;
    sidebar.classList.toggle('collapsed', sidebarCollapsed);
  });
  
  // Navigation items
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      navItems.forEach(nav => nav.classList.remove('active'));
      e.currentTarget.classList.add('active');
    });
  });
}

// Navigation between pages
function initializeNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const dashboardPage = document.getElementById('dashboardPage');
  const groupsPage = document.getElementById('groupsPage');
  
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const page = item.getAttribute('data-page');
      
      if (page === 'dashboard') {
        dashboardPage.style.display = 'block';
        groupsPage.style.display = 'none';
      } else if (page === 'groups') {
        dashboardPage.style.display = 'none';
        groupsPage.style.display = 'block';
        renderGroups();
      } else {
        // Other pages not implemented yet
        dashboardPage.style.display = 'none';
        groupsPage.style.display = 'none';
      }
    });
  });
}

// User menu management
function initializeUserMenu() {
  const userMenuBtn = document.getElementById('userMenuBtn');
  const userMenuDropdown = document.getElementById('userMenuDropdown');
  
  userMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    userMenuDropdown.classList.toggle('active');
  });
  
  document.addEventListener('click', () => {
    userMenuDropdown.classList.remove('active');
  });
}

// Filter chips management
function initializeFilters() {
  const chips = document.querySelectorAll('.chip');
  
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
    });
  });
}

// Workspace data
const workspaceData = {
  name: 'DreamEd Academy',
  total_groups: 10,
  total_students: 242,
  total_calls: 119,
  total_followups: 34,
  overall_conversion: 21.6,
  active_users_today: 12,
  charts: {
    group_leaderboard: {
      groups: ['Corporate Training', 'VIP Prospects', 'Enterprise Q4', 'Referral Network', 'Batch A - Fall'],
      conversion: [75.0, 58.3, 44.4, 37.5, 28.6]
    },
    students_over_time: {
      dates: ['2025-09', '2025-10', '2025-11'],
      data: [54, 63, 125]
    },
    calls_trend: {
      dates: ['2025-11-01', '2025-11-05', '2025-11-09', '2025-11-13'],
      calls: [16, 23, 29, 14],
      followups: [7, 12, 9, 6]
    },
    activity_heatmap: {
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      hours: [9, 10, 11, 12, 13, 14, 15, 16, 17],
      data: [[0, 2, 1, 3, 2, 1, 0], [1, 3, 2, 4, 3, 2, 1], [0, 2, 4, 2, 5, 3, 0], [2, 3, 2, 5, 3, 2, 1], [1, 1, 3, 4, 2, 1, 0], [0, 2, 1, 2, 1, 0, 1], [0, 1, 0, 1, 0, 2, 2]]
    },
    group_status_dist: {
      labels: ['Active', 'Completed', 'Archived'],
      data: [7, 1, 2]
    },
    top_members: {
      members: ['A. Khan', 'S. Rahman', 'I. Bari', 'P. Chowdhury', 'J. Alam'],
      conversions: [32, 28, 25, 21, 19]
    }
  }
};

// Chart initialization
function initializeCharts() {
  initializeGroupsLeaderboardChart();
  initializeStudentsOverTimeChart();
  initializeCallsFollowupsTrendChart();
  initializeGroupStatusDistChart();
  initializeTopMembersChart();
  initializeActivityHeatmapChart();
}

// Groups Leaderboard Chart
function initializeGroupsLeaderboardChart() {
  const ctx = document.getElementById('groupsLeaderboardChart');
  if (!ctx) return;
  
  const data = workspaceData.charts.group_leaderboard;
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.groups,
      datasets: [{
        label: 'Conversion Rate (%)',
        data: data.conversion,
        backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#5D878F', '#DB4545'],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          borderRadius: 8,
          callbacks: {
            label: function(context) {
              return context.parsed.x + '% conversion';
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            font: {
              size: 12
            },
            callback: function(value) {
              return value + '%';
            }
          }
        },
        y: {
          grid: {
            display: false
          },
          ticks: {
            font: {
              size: 12
            }
          }
        }
      }
    }
  });
}

// Students Over Time Chart
function initializeStudentsOverTimeChart() {
  const ctx = document.getElementById('studentsOverTimeChart');
  if (!ctx) return;
  
  const data = workspaceData.charts.students_over_time;
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['September', 'October', 'November'],
      datasets: [{
        label: 'Students Added',
        data: data.data,
        borderColor: '#1FB8CD',
        backgroundColor: 'rgba(31, 184, 205, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: '#1FB8CD',
        pointBorderColor: '#fff',
        pointBorderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          borderRadius: 8
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: {
              size: 12
            }
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            font: {
              size: 12
            }
          }
        }
      }
    }
  });
}

// Calls & Follow-ups Trend Chart
function initializeCallsFollowupsTrendChart() {
  const ctx = document.getElementById('callsFollowupsTrendChart');
  if (!ctx) return;
  
  const data = workspaceData.charts.calls_trend;
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Nov 1', 'Nov 5', 'Nov 9', 'Nov 13'],
      datasets: [
        {
          label: 'Calls',
          data: data.calls,
          borderColor: '#1FB8CD',
          backgroundColor: 'rgba(31, 184, 205, 0.2)',
          tension: 0.4,
          fill: true,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: '#1FB8CD',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        },
        {
          label: 'Follow-ups',
          data: data.followups,
          borderColor: '#FFC185',
          backgroundColor: 'rgba(255, 193, 133, 0.2)',
          tension: 0.4,
          fill: true,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: '#FFC185',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 15,
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          borderRadius: 8
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: {
              size: 12
            }
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            font: {
              size: 12
            }
          }
        }
      }
    }
  });
}

// Group Status Distribution Chart
function initializeGroupStatusDistChart() {
  const ctx = document.getElementById('groupStatusDistChart');
  if (!ctx) return;
  
  const data = workspaceData.charts.group_status_dist;
  
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.labels,
      datasets: [{
        data: data.data,
        backgroundColor: ['#1FB8CD', '#5D878F', '#B4413C'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 12,
            font: { size: 12 }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 10,
          borderRadius: 6
        }
      },
      cutout: '65%'
    }
  });
}

// Top Members Chart
function initializeTopMembersChart() {
  const ctx = document.getElementById('topMembersChart');
  if (!ctx) return;
  
  const data = workspaceData.charts.top_members;
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.members,
      datasets: [{
        label: 'Conversions',
        data: data.conversions,
        backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#5D878F', '#DB4545'],
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 10,
          borderRadius: 6
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: {
              size: 11
            }
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            font: {
              size: 11
            }
          }
        }
      }
    }
  });
}

// Activity Heatmap Chart
function initializeActivityHeatmapChart() {
  const ctx = document.getElementById('activityHeatmapChart');
  if (!ctx) return;
  
  const heatmapData = workspaceData.charts.activity_heatmap;
  const days = heatmapData.days;
  const hours = ['9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM'];
  
  // Transform to bubble chart data
  const bubbleData = [];
  heatmapData.data.forEach((row, hourIdx) => {
    row.forEach((value, dayIdx) => {
      bubbleData.push({
        x: dayIdx,
        y: hourIdx,
        r: value * 3 + 2
      });
    });
  });
  
  new Chart(ctx, {
    type: 'bubble',
    data: {
      datasets: [{
        label: 'Call Activity',
        data: bubbleData,
        backgroundColor: 'rgba(31, 184, 205, 0.6)',
        borderColor: '#1FB8CD',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          borderRadius: 8,
          callbacks: {
            label: function(context) {
              const dayIdx = Math.round(context.parsed.x);
              const hourIdx = Math.round(context.parsed.y);
              const calls = heatmapData.data[hourIdx][dayIdx];
              return `${days[dayIdx]} ${hours[hourIdx]}: ${calls} calls`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          min: -0.5,
          max: 6.5,
          ticks: {
            stepSize: 1,
            callback: function(value) {
              return days[value] || '';
            },
            font: {
              size: 11
            }
          },
          grid: {
            display: false
          }
        },
        y: {
          type: 'linear',
          min: -0.5,
          max: 8.5,
          reverse: false,
          ticks: {
            stepSize: 1,
            callback: function(value) {
              return hours[value] || '';
            },
            font: {
              size: 11
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        }
      }
    }
  });
}

// Groups Management
function initializeGroups() {
  renderGroups();
  initializeGroupsCharts();
  
  // Search
  const searchInput = document.getElementById('groupSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterGroups();
    });
  }
  
  // Filters
  const statusFilter = document.getElementById('statusFilter');
  const programFilter = document.getElementById('programFilter');
  const sortBy = document.getElementById('sortBy');
  
  if (statusFilter) {
    statusFilter.addEventListener('change', filterGroups);
  }
  if (programFilter) {
    programFilter.addEventListener('change', filterGroups);
  }
  if (sortBy) {
    sortBy.addEventListener('change', filterGroups);
  }
  
  // View toggle
  const viewBtns = document.querySelectorAll('.view-btn');
  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      viewBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentView = btn.getAttribute('data-view');
      renderGroups();
    });
  });
  
  // Modal close
  const closeModal = document.getElementById('closeModal');
  const modal = document.getElementById('groupDetailModal');
  const modalOverlay = modal ? modal.querySelector('.modal-overlay') : null;
  
  if (closeModal) {
    closeModal.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }
  
  if (modalOverlay) {
    modalOverlay.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }
}

function filterGroups() {
  const searchTerm = document.getElementById('groupSearch')?.value.toLowerCase() || '';
  const statusFilter = document.getElementById('statusFilter')?.value || 'all';
  const programFilter = document.getElementById('programFilter')?.value || 'all';
  const sortBy = document.getElementById('sortBy')?.value || 'name';
  
  // Filter
  filteredGroups = groupsData.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchTerm) || 
                         group.program.toLowerCase().includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || group.status === statusFilter;
    const matchesProgram = programFilter === 'all' || group.program === programFilter;
    
    return matchesSearch && matchesStatus && matchesProgram;
  });
  
  // Sort
  filteredGroups.sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'size':
        return b.student_count - a.student_count;
      case 'created':
        return new Date(b.created) - new Date(a.created);
      case 'conversion':
        return b.conversion_rate - a.conversion_rate;
      default:
        return 0;
    }
  });
  
  renderGroups();
}

function renderGroups() {
  const container = document.getElementById('groupsGrid');
  if (!container) return;
  
  if (currentView === 'list') {
    container.classList.add('list-view');
  } else {
    container.classList.remove('list-view');
  }
  
  container.innerHTML = filteredGroups.map(group => {
    const statusClass = group.status.toLowerCase();
    const teamInitials = group.team_members.map(member => {
      const parts = member.split(' ');
      return parts.map(p => p[0]).join('');
    });
    
    return `
      <div class="group-card" style="--group-color: ${group.color}" onclick="openGroupDetail(${group.id})">
        <div class="group-card-header">
          <div>
            <div class="group-name">${group.name}</div>
            <div class="group-program">${group.program}</div>
          </div>
          <span class="group-status-badge ${statusClass}">${group.status}</span>
        </div>
        <div class="group-metrics">
          <div class="metric-item">
            <div class="metric-label">Students</div>
            <div class="metric-value">${group.student_count}</div>
          </div>
          <div class="metric-item">
            <div class="metric-label">Conversion</div>
            <div class="metric-value">${group.conversion_rate}%</div>
          </div>
          <div class="metric-item">
            <div class="metric-label">Calls</div>
            <div class="metric-value">${group.calls_made}</div>
          </div>
          <div class="metric-item">
            <div class="metric-label">Follow-ups</div>
            <div class="metric-value">${group.pending_followups}</div>
          </div>
        </div>
        <div class="group-meta">
          <div class="group-team">
            ${teamInitials.map((initials, idx) => `
              <div class="team-avatar" style="background: ${['#1FB8CD', '#FFC185', '#B4413C', '#5D878F'][idx % 4]}33; color: ${['#1FB8CD', '#FFC185', '#B4413C', '#5D878F'][idx % 4]}">${initials}</div>
            `).join('')}
          </div>
          <div class="group-date">${formatDate(group.created)}</div>
        </div>
      </div>
    `;
  }).join('');
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

function openGroupDetail(groupId) {
  const group = groupsData.find(g => g.id === groupId);
  if (!group) return;
  
  const modal = document.getElementById('groupDetailModal');
  const modalName = document.getElementById('modalGroupName');
  const modalBody = document.getElementById('modalBody');
  
  modalName.textContent = group.name;
  
  // Sample students data for the group
  const sampleStudents = [
    { name: 'Ahmed Rahman', status: 'Converted', lastContact: '2 days ago', calls: 5 },
    { name: 'Fatima Khan', status: 'In Progress', lastContact: '1 day ago', calls: 3 },
    { name: 'Omar Hassan', status: 'Follow Up', lastContact: '3 hours ago', calls: 2 },
    { name: 'Aisha Begum', status: 'New', lastContact: '1 week ago', calls: 1 },
    { name: 'Yusuf Ali', status: 'Converted', lastContact: '5 days ago', calls: 4 }
  ];
  
  modalBody.innerHTML = `
    <div class="modal-info-grid">
      <div class="modal-info-item">
        <div class="modal-info-label">Total Students</div>
        <div class="modal-info-value">${group.student_count}</div>
      </div>
      <div class="modal-info-item">
        <div class="modal-info-label">Conversion Rate</div>
        <div class="modal-info-value">${group.conversion_rate}%</div>
      </div>
      <div class="modal-info-item">
        <div class="modal-info-label">Total Calls</div>
        <div class="modal-info-value">${group.calls_made}</div>
      </div>
    </div>
    
    <div class="modal-section">
      <h3>Group Information</h3>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px;">
        <div>
          <div class="modal-info-label">Program</div>
          <div style="font-size: 16px; margin-top: 4px;">${group.program}</div>
        </div>
        <div>
          <div class="modal-info-label">Status</div>
          <div style="font-size: 16px; margin-top: 4px;">${group.status}</div>
        </div>
        <div>
          <div class="modal-info-label">Created</div>
          <div style="font-size: 16px; margin-top: 4px;">${formatDate(group.created)}</div>
        </div>
        <div>
          <div class="modal-info-label">Team Members</div>
          <div style="font-size: 16px; margin-top: 4px;">${group.team_members.join(', ')}</div>
        </div>
      </div>
    </div>
    
    <div class="modal-section">
      <h3>Students (${sampleStudents.length} of ${group.student_count})</h3>
      <table class="students-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Last Contact</th>
            <th>Calls</th>
          </tr>
        </thead>
        <tbody>
          ${sampleStudents.map(student => `
            <tr>
              <td>${student.name}</td>
              <td><span class="status status--info">${student.status}</span></td>
              <td>${student.lastContact}</td>
              <td>${student.calls}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  
  modal.classList.add('active');
}

function initializeGroupsCharts() {
  initializeGroupsStatusChart();
  initializeStudentsDistChart();
}

function initializeGroupsStatusChart() {
  const ctx = document.getElementById('groupsStatusChart');
  if (!ctx) return;
  
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Active', 'Completed', 'Archived'],
      datasets: [{
        data: [7, 1, 2],
        backgroundColor: ['#1FB8CD', '#5D878F', '#B4413C'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 12,
            font: { size: 11 }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 10,
          borderRadius: 6
        }
      },
      cutout: '60%'
    }
  });
}

function initializeStudentsDistChart() {
  const ctx = document.getElementById('studentsDistChart');
  if (!ctx) return;
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Batch A', 'Enterprise', 'Trial Nov', 'VIP', 'Batch B', 'Referral', 'Weekend', 'Others'],
      datasets: [{
        label: 'Students',
        data: [35, 18, 52, 12, 28, 24, 41, 32],
        backgroundColor: '#1FB8CD',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 10,
          borderRadius: 6
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 10 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0, 0, 0, 0.05)' },
          ticks: { font: { size: 10 } }
        }
      }
    }
  });
}

// Navigation helper for insights
function navigateToGroup(groupName) {
  // Navigate to groups page
  const groupsNavItem = document.querySelector('.nav-item[data-page="groups"]');
  if (groupsNavItem) {
    groupsNavItem.click();
  }
  
  // Filter to the specific group
  setTimeout(() => {
    const searchInput = document.getElementById('groupSearch');
    if (searchInput) {
      searchInput.value = groupName;
      filterGroups();
    }
  }, 100);
}

// Make navigation helper available globally
window.navigateToGroup = navigateToGroup;
window.openGroupDetail = openGroupDetail;